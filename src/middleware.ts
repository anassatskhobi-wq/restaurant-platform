import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the Supabase session cookie fresh on every request, and gates
// everything under /admin behind a logged-in session (the actual
// tenant/venue permission check happens per-page via StaffMember).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  // Both need to be reachable without an existing session: /login for the
  // normal sign-in form, /reset-password because the recovery link's
  // tokens live in the URL fragment, which the server never sees — the
  // client-side Supabase SDK establishes the session only after this
  // page has already loaded.
  const isPublicAdminRoute =
    request.nextUrl.pathname.startsWith("/admin/login") ||
    request.nextUrl.pathname.startsWith("/admin/reset-password");

  if (isAdminRoute && !isPublicAdminRoute && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
