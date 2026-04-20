import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Role, Profile } from "@prisma/client";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Get the current user's profile. Throws AuthError if not authenticated. */
export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError("No autenticado");
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile || !profile.is_active) {
    throw new AuthError("Perfil no encontrado o desactivado");
  }

  return profile;
}

/** Verify the current user has one of the allowed roles. */
export async function requireRole(...allowedRoles: Role[]): Promise<Profile> {
  const profile = await getProfile();

  if (!allowedRoles.includes(profile.role)) {
    throw new AuthError(
      `Rol ${profile.role} no tiene acceso. Requiere: ${allowedRoles.join(", ")}`
    );
  }

  return profile;
}
