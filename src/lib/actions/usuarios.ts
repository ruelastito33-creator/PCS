"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/types";

const VALID_ROLES: Role[] = [
  "OPERACIONES",
  "COCINA",
  "CHOFER",
  "SURTIDOR_AGUAS",
  "HIELERA",
  "INSUMOS",
];

function supabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function crearUsuarioSistema(input: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole("OPERACIONES");

    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const password = input.password;
    const role = input.role;

    if (!email || !fullName || !password) {
      return {
        success: false,
        error: "Email, nombre y contrasena son obligatorios.",
      };
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { success: false, error: "Email invalido." };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: "La contrasena debe tener al menos 8 caracteres.",
      };
    }

    if (!VALID_ROLES.includes(role)) {
      return { success: false, error: "Rol invalido." };
    }

    const supabase = supabaseAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      const msg = error?.message ?? "No se pudo crear usuario en Auth.";
      if (msg.toLowerCase().includes("already")) {
        return {
          success: false,
          error:
            "El usuario ya existe en Auth. Usa reset de contrasena o edita el rol.",
        };
      }
      return { success: false, error: msg };
    }

    await prisma.profile.upsert({
      where: { id: data.user.id },
      update: {
        email,
        full_name: fullName,
        role,
        is_active: true,
      },
      create: {
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        is_active: true,
      },
    });

    revalidatePath("/settings");
    return { success: true, data: { id: data.user.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error desconocido.",
    };
  }
}

export async function cambiarRolUsuario(
  profileId: string,
  role: Role
): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");

    if (!VALID_ROLES.includes(role)) {
      return { success: false, error: "Rol invalido." };
    }

    await prisma.profile.update({
      where: { id: profileId },
      data: { role },
    });

    revalidatePath("/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error desconocido.",
    };
  }
}

export async function toggleUsuarioActivo(profileId: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("OPERACIONES");

    const target = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!target) return { success: false, error: "Usuario no encontrado." };

    if (actor.id === target.id && target.is_active) {
      return {
        success: false,
        error: "No puedes desactivarte a ti mismo.",
      };
    }

    await prisma.profile.update({
      where: { id: profileId },
      data: { is_active: !target.is_active },
    });

    revalidatePath("/settings");
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error desconocido.",
    };
  }
}

export async function enviarResetPassword(email: string): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return { success: false, error: "Email requerido." };
    }

    const supabase = supabaseAdminClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalized);
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error desconocido.",
    };
  }
}
