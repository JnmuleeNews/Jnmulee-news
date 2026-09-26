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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Allow the login page without authentication.
  if (pathname === "/admin/login") {
    return response;
  }

  // Protect every other /admin route.
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";

      return NextResponse.redirect(url);
    }

    // Only accounts with the admin role can enter.
    if (user.app_metadata?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";

      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};