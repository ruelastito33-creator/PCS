import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROLE_HOME } from "@/lib/constants";
import type { Role } from "@prisma/client";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Root → redirect based on auth status
  if (request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    if (!user) {
      url.pathname = "/login";
    } else {
      // Default to operaciones; role-based redirect happens at page level
      url.pathname = "/operaciones";
    }
    return NextResponse.redirect(url);
  }

  // Protect all routes except /login and /auth
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/api/health") &&
    !request.nextUrl.pathname.startsWith("/api/kiosk") &&
    !request.nextUrl.pathname.startsWith("/_next")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
