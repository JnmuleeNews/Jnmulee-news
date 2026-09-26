import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const authClient = createClient(
  supabaseUrl,
  anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type Permissions = {
  can_import: boolean;
  can_write: boolean;
  can_publish: boolean;
  can_manage_comments: boolean;
};

async function getAdmin(request: Request) {
  const authorization =
    request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  const {
    data,
    error,
  } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  if (
    data.user.app_metadata?.role !==
    "admin"
  ) {
    return null;
  }

  return data.user;
}

export async function GET(request: Request) {
  const admin = await getAdmin(request);

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator authentication required.",
      },
      { status: 401 }
    );
  }

  const {
    data,
    error,
  } =
    await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const workers = data.users
    .filter(
      (user) =>
        user.app_metadata?.role ===
        "worker"
    )
    .map((user) => ({
      id: user.id,
      email: user.email || "",
      display_name:
        user.app_metadata
          ?.display_name || "",
      permissions:
        user.app_metadata
          ?.permissions || {},
      active: !user.banned_until,
      created_at:
        user.created_at,
      last_sign_in_at:
        user.last_sign_in_at,
    }));

  return NextResponse.json({
    workers,
  });
}

export async function POST(
  request: Request
) {
  const admin = await getAdmin(request);

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator authentication required.",
      },
      { status: 401 }
    );
  }

  try {
    const body =
      await request.json();

    const email =
      String(
        body.email || ""
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        body.password || ""
      );

    const displayName =
      String(
        body.display_name || ""
      ).trim();

    const permissions: Permissions =
      {
        can_import: Boolean(
          body.permissions
            ?.can_import
        ),
        can_write: Boolean(
          body.permissions
            ?.can_write
        ),
        can_publish: Boolean(
          body.permissions
            ?.can_publish
        ),
        can_manage_comments:
          Boolean(
            body.permissions
              ?.can_manage_comments
          ),
      };

    if (
      !email ||
      !password ||
      !displayName
    ) {
      return NextResponse.json(
        {
          error:
            "Name, email and password are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Worker password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const {
      data,
      error,
    } =
      await adminClient.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,
          app_metadata: {
            role: "worker",
            display_name:
              displayName,
            permissions,
          },
        }
      );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        {
          error:
            "Worker account was not created.",
        },
        { status: 500 }
      );
    }

    const {
      error:
        profileError,
    } =
      await adminClient
        .from(
          "worker_profiles"
        )
        .upsert({
          user_id:
            data.user.id,
          display_name:
            displayName,
          permissions,
          active: true,
        });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(
        data.user.id
      );

      return NextResponse.json(
        {
          error:
            profileError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      worker: {
        id: data.user.id,
        email:
          data.user.email,
        display_name:
          displayName,
        permissions,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create worker.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request
) {
  const admin = await getAdmin(request);

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator authentication required.",
      },
      { status: 401 }
    );
  }

  try {
    const body =
      await request.json();

    const id =
      String(body.id || "");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Worker ID is required.",
        },
        { status: 400 }
      );
    }

    const {
      data,
      error:
        lookupError,
    } =
      await adminClient.auth.admin.getUserById(
        id
      );

    if (
      lookupError ||
      !data.user
    ) {
      return NextResponse.json(
        {
          error:
            lookupError?.message ||
            "Worker not found.",
        },
        { status: 404 }
      );
    }

    if (
      data.user.app_metadata
        ?.role !== "worker"
    ) {
      return NextResponse.json(
        {
          error:
            "That account is not a worker.",
        },
        { status: 400 }
      );
    }

    const permissions: Permissions =
      {
        can_import: Boolean(
          body.permissions
            ?.can_import
        ),
        can_write: Boolean(
          body.permissions
            ?.can_write
        ),
        can_publish: Boolean(
          body.permissions
            ?.can_publish
        ),
        can_manage_comments:
          Boolean(
            body.permissions
              ?.can_manage_comments
          ),
      };

    const displayName =
      String(
        body.display_name ||
          data.user.app_metadata
            ?.display_name ||
          ""
      ).trim();

    const active =
      body.active !== false;

    const {
      error,
    } =
      await adminClient.auth.admin.updateUserById(
        id,
        {
          app_metadata: {
            ...data.user
              .app_metadata,
            role: "worker",
            display_name:
              displayName,
            permissions,
          },
          ban_duration:
            active
              ? "none"
              : "876000h",
        }
      );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        { status: 400 }
      );
    }

    await adminClient
      .from("worker_profiles")
      .upsert({
        user_id: id,
        display_name:
          displayName,
        permissions,
        active,
        updated_at:
          new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update worker.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request
) {
  const admin = await getAdmin(request);

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator authentication required.",
      },
      { status: 401 }
    );
  }

  try {
    const body =
      await request.json();

    const id =
      String(body.id || "");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Worker ID is required.",
        },
        { status: 400 }
      );
    }

    const {
      data,
      error:
        lookupError,
    } =
      await adminClient.auth.admin.getUserById(
        id
      );

    if (
      lookupError ||
      !data.user
    ) {
      return NextResponse.json(
        {
          error:
            lookupError?.message ||
            "Worker not found.",
        },
        { status: 404 }
      );
    }

    if (
      data.user.app_metadata
        ?.role !== "worker"
    ) {
      return NextResponse.json(
        {
          error:
            "Only worker accounts can be deleted here.",
        },
        { status: 400 }
      );
    }

    const {
      error,
    } =
      await adminClient.auth.admin.deleteUser(
        id
      );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        { status: 400 }
      );
    }

    await adminClient
      .from("worker_profiles")
      .delete()
      .eq("user_id", id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete worker.",
      },
      { status: 500 }
    );
  }
}