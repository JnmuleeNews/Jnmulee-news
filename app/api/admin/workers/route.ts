import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

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
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      error: "Unauthorized",
    },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(
  request: Request
) {
  try {
    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization?.startsWith(
        "Bearer "
      )
    ) {
      return unauthorized();
    }

    const accessToken =
      authorization
        .slice(7)
        .trim();

    if (!accessToken) {
      return unauthorized();
    }

    /*
     * Verify the actual Supabase user
     * associated with the access token.
     */
    const {
      data: { user },
      error: userError,
    } =
      await authClient.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      return unauthorized();
    }

    /*
     * Only worker accounts may use this
     * endpoint.
     *
     * Authorization comes from app_metadata,
     * not user_metadata.
     */
    if (
      user.app_metadata?.role !==
      "worker"
    ) {
      return unauthorized();
    }

    /*
     * Retrieve ONLY this worker's profile.
     */
    const {
      data: worker,
      error: workerError,
    } =
      await adminClient
        .from("worker_profiles")
        .select(
          "user_id,display_name,permissions,active,created_at,updated_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (workerError) {
      console.error(
        "Worker profile lookup failed:",
        workerError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load worker profile.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /*
     * A worker must have a corresponding
     * worker_profiles record.
     */
    if (!worker) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Worker profile not found.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /*
     * Disabled workers cannot use the
     * worker dashboard.
     */
    if (
      worker.active !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Worker account is disabled.",
          worker: {
            display_name:
              worker.display_name,
            permissions:
              worker.permissions || {},
            active: false,
          },
        },
        {
          status: 403,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        worker: {
          user_id:
            worker.user_id,
          display_name:
            worker.display_name,
          permissions:
            worker.permissions || {},
          active:
            worker.active,
          created_at:
            worker.created_at,
          updated_at:
            worker.updated_at,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Worker profile API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Internal server error.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}