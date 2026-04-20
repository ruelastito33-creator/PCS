"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Watchdog de sesión para tablets kiosk.
 * Cada 5 min verifica que la sesión Supabase siga viva.
 * Si expira y no se puede refrescar, redirige automáticamente
 * a la URL de auto-login para re-autenticarse.
 */
export function SessionWatchdog() {
  useEffect(() => {
    const isKiosk = getCookie("kiosk") === "true";
    if (!isKiosk) return;

    const supabase = createClient();

    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        // Sesión expirada — intentar re-autenticar via kiosk URL
        const authUrl = getCookie("kiosk-auth-url");
        if (authUrl) {
          window.location.href = authUrl;
        } else {
          window.location.href = "/login";
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return null;
}
