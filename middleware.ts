import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // The admin login page must always be accessible.
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader =
            request.headers.get("cookie") || "";

          return cookieHeader
            .split(";")
            .map((cookie) => cookie.trim())
            .filter(Boolean)
            .map((cookie) => {
              const index = cookie.indexOf("=");

              return {
                name:
                  index >= 0
                    ? cookie.slice(0, index)
                    : cookie,
                value:
                  index >= 0
                    ? decodeURIComponent(
                        cookie.slice(index + 1)
                      )
                    : "",
              };
            });
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/admin/login", request.url)
    );
  }

  const role = user.app_metadata?.role;

  if (role !== "admin") {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};