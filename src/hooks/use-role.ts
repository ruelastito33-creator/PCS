"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Role } from "@prisma/client";

export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setRole(null);
          return;
        }

        const res = await fetch(`/api/profile`);
        if (res.ok) {
          const data = await res.json();
          setRole(data.role);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, []);

  return { role, loading };
}
