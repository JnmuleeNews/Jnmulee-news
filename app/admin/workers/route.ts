import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

function cleanPermissions(
  input: unknown
): Permissions {
  const value =
    typeof input === "object" &&
    input !== null
      ? (input as Record<string, unknown>)
      : {};

  return {
    can_import:
      value.can_import === true,
    can_write:
      value.can_write === true,
    can_publish:
      value.can_publish === true,
    can_manage_comments:
      value.can_manage_comments === true,
  };
}

function cleanName(
  value: unknown
): string {
  return String(value || "")
    .trim()
    .slice(0, 100);
}

function cleanEmail(
  value: unknown
): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

async function getAdmin(
  request: Request
) {
  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const token =
    authorization.slice(7).trim();

  if (!token) {
    return null;
  }

  const {
    data,
    error,
  } =
    await authClient.auth.getUser(
      token
    );

  if (
    error ||
    !data.user
  ) {
    return null;
  }

  if (
    data.user.app_metadata
      ?.role !== "admin"
  ) {
    return null;
  }

  return data.user;
}

function unauthorized() {
  return NextResponse.json(
    {
      error:
        "Administrator authentication required.",
    },
    { status: 401 }
  );
}

/* =========================
   GET WORKERS
========================= */

export async function GET(
  request: Request
) {
  const admin =
    await getAdmin(request);

  if (!admin) {
    return unauthorized();
  }

  try {
    const {
      data,
      error,
    } =
      await adminClient.auth.admin.listUsers(
        {
          page: 1,
          perPage: 100,
        }
      );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        { status: 500 }
      );
    }

    const workers =
      data.users
        .filter(
          (user) =>
            user.app_metadata
              ?.role ===
            "worker"
        )
        .map((user) => ({
          id: user.id,
          email:
            user.email || "",
          display_name:
            user.app_metadata
              ?.display_name ||
            "",
          permissions:
            cleanPermissions(
              user.app_metadata
                ?.permissions
            ),
          active:
            !user.banned_until ||
            new Date(
              user.banned_until
            ) < new Date(),
          created_at:
            user.created_at,
          last_sign_in_at:
            user.last_sign_in_at ||
            null,
        }));

    return NextResponse.json(
      {
        success: true,
        workers,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load workers.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE WORKER
========================= */

export async function POST(
  request: Request
) {
  const admin =
    await getAdmin(request);

  if (!admin) {
    return unauthorized();
  }

  try {
    const body =
      await request.json();

    const email =
      cleanEmail(body.email);

    const password =
      String(
        body.password || ""
      );

    const displayName =
      cleanName(
        body.display_name
      );

    const permissions =
      cleanPermissions(
        body.permissions
      );

    if (
      !email ||
      !displayName ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Name, email and password are required.",
        },
        { status: 400 }
      );
    }

    if (
      !email.includes("@") ||
      email.length < 5
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid worker email address.",
        },
        { status: 400 }
      );
    }

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "Worker password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    if (
      password.length > 128
    ) {
      return NextResponse.json(
        {
          error:
            "Worker password is too long.",
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

    if (
      error ||
      !data.user
    ) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Worker account was not created.",
        },
        { status: 400 }
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
        .upsert(
          {
            user_id:
              data.user.id,
            display_name:
              displayName,
            permissions,
            active: true,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_id",
          }
        );

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

    return NextResponse.json(
      {
        success: true,
        worker: {
          id: data.user.id,
          email:
            data.user.email ||
            email,
          display_name:
            displayName,
          permissions,
          active: true,
        },
      },
      { status: 201 }
    );
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

/* =========================
   UPDATE WORKER
========================= */

export async function PATCH(
  request: Request
) {
  const admin =
    await getAdmin(request);

  if (!admin) {
    return unauthorized();
  }

  try {
    const body =
      await request.json();

    const id =
      String(body.id || "").trim();

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

    const oldMetadata =
      data.user.app_metadata ||
      {};

    const permissions =
      cleanPermissions(
        body.permissions ??
          oldMetadata.permissions
      );

    const displayName =
      cleanName(
        body.display_name ??
          oldMetadata.display_name
      );

    if (!displayName) {
      return NextResponse.json(
        {
          error:
            "Worker display name is required.",
        },
        { status: 400 }
      );
    }

    const active =
      body.active !== false;

    const {
      data: updated,
      error,
    } =
      await adminClient.auth.admin.updateUserById(
        id,
        {
          app_metadata: {
            ...oldMetadata,
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

    if (!updated.user) {
      return NextResponse.json(
        {
          error:
            "Worker account could not be updated.",
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
        .upsert(
          {
            user_id: id,
            display_name:
              displayName,
            permissions,
            active,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_id",
          }
        );

    if (profileError) {
      return NextResponse.json(
        {
          error:
            `Worker updated, but profile synchronization failed: ${profileError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      worker: {
        id,
        email:
          updated.user.email ||
          "",
        display_name:
          displayName,
        permissions,
        active,
      },
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

/* =========================
   DELETE WORKER
========================= */

export async function DELETE(
  request: Request
) {
  const admin =
    await getAdmin(request);

  if (!admin) {
    return unauthorized();
  }

  try {
    const body =
      await request.json();

    const id =
      String(body.id || "").trim();

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
      error:
        profileError,
    } =
      await adminClient
        .from(
          "worker_profiles"
        )
        .delete()
        .eq(
          "user_id",
          id
        );

    if (profileError) {
      return NextResponse.json(
        {
          error:
            profileError.message,
        },
        { status: 500 }
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