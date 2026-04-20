import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, full_name: true, role: true },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Perfil no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(profile);
}
