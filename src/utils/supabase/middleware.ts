import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  const pathname = request.nextUrl.pathname;

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
  if (pathname === "/") {
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
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/kiosk") ||
    pathname.startsWith("/_next") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname === "/favicon.ico";

  // Allow static asset requests (fonts, images, scripts, css, manifest, etc.)
  const isAssetFile = /\.[a-zA-Z0-9]+$/.test(pathname);

  if (!user && !isPublicPath && !isAssetFile) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
