import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROLE_HOME } from "@/lib/constants";
import type { Role } from "@prisma/client";

/** Mapeo explícito de rol a email kiosk (debe coincidir con create-kiosk-users.ts) */
const KIOSK_EMAIL: Partial<Record<Role, string>> = {
  COCINA: "kiosk-cocina@tuxpenos.local",
  CHOFER: "kiosk-chofer@tuxpenos.local",
  SURTIDOR_AGUAS: "kiosk-aguas@tuxpenos.local",
  HIELERA: "kiosk-hieleras@tuxpenos.local",
  INSUMOS: "kiosk-insumos@tuxpenos.local",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const role = searchParams.get("role") as Role | null;
  const key = searchParams.get("key");

  // Validate params
  if (!role || !key) {
    return NextResponse.json(
      { error: "Parámetros role y key requeridos" },
      { status: 400 },
    );
  }

  if (key !== process.env.KIOSK_SECRET) {
    return NextResponse.json({ error: "Clave inválida" }, { status: 401 });
  }

  const email = KIOSK_EMAIL[role];
  if (!email) {
    return NextResponse.json(
      { error: `Rol inválido. Válidos: ${Object.keys(KIOSK_EMAIL).join(", ")}` },
      { status: 400 },
    );
  }
  const password = process.env.KIOSK_PASSWORD!;

  // Build redirect URL
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = ROLE_HOME[role];
  redirectUrl.search = "";

  // Create response first so we can write cookies to it
  const response = NextResponse.redirect(redirectUrl);

  // Create Supabase client that writes cookies to the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Sign in with kiosk credentials
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: `Error de autenticación: ${error.message}` },
      { status: 401 },
    );
  }

  // Set kiosk marker cookies for the session watchdog
  const kioskAuthUrl = `${request.nextUrl.pathname}?role=${role}&key=${key}`;
  response.cookies.set("kiosk", "true", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  response.cookies.set("kiosk-auth-url", kioskAuthUrl, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
