import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({
            request,
          });

          for (const {
            name,
            value,
            options,
          } of cookiesToSet) {
            response.cookies.set(
              name,
              value,
              options
            );
          }
        },
      },
    }
  );

  /*
   * Refresh the Supabase session when necessary.
   *
   * IMPORTANT:
   * We deliberately do NOT redirect /admin here.
   * The browser-side admin dashboard handles the
   * administrator check. This prevents the
   * /admin/login <-> /admin redirect loop.
   */
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on admin pages so Supabase can refresh
     * authentication cookies.
     */
    "/admin/:path*",
  ],
};