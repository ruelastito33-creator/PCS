import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { ROLE_HOME } from "@/lib/constants";
import type { Role, Profile } from "@prisma/client";

/**
 * Get the current user's profile for a page.
 * Redirects to login if not authenticated, or to role home if unauthorized.
 */
export async function getPageProfile(
  ...allowedRoles: Role[]
): Promise<Profile> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!profile || !profile.is_active) {
      redirect("/login");
    }

    // If roles specified, check authorization
    if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
      redirect(ROLE_HOME[profile.role]);
    }

    return profile;
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    // Supabase not configured, DB down, etc.
    redirect("/login");
  }
}
