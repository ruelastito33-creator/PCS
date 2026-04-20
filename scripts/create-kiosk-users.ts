/**
 * Crea los 5 usuarios kiosk (uno por tablet/rol operativo).
 * Cada usuario se crea en Supabase Auth + perfil en la DB local.
 *
 * Uso:
 *   npx tsx scripts/create-kiosk-users.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;
const kioskPassword = process.env.KIOSK_PASSWORD!;

if (!kioskPassword) {
  console.error("KIOSK_PASSWORD no definido en .env");
  process.exit(1);
}

const KIOSK_USERS = [
  { email: "kiosk-cocina@tuxpenos.local", fullName: "Tablet Cocina", role: "COCINA" },
  { email: "kiosk-chofer@tuxpenos.local", fullName: "Tablet Chofer", role: "CHOFER" },
  { email: "kiosk-aguas@tuxpenos.local", fullName: "Tablet Aguas", role: "SURTIDOR_AGUAS" },
  { email: "kiosk-hieleras@tuxpenos.local", fullName: "Tablet Hieleras", role: "HIELERA" },
  { email: "kiosk-insumos@tuxpenos.local", fullName: "Tablet Insumos", role: "INSUMOS" },
] as const;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function upsertProfile(id: string, email: string, fullName: string, role: string) {
  await prisma.profile.upsert({
    where: { id },
    update: { full_name: fullName, role: role as never },
    create: { id, email, full_name: fullName, role: role as never },
  });
}

async function createKioskUser(email: string, fullName: string, role: string) {
  console.log(`\n  Creando ${role} → ${email}...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: kioskPassword,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log(`  ⚠  Ya existe en Supabase Auth — actualizando perfil...`);
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === email);
      if (!existing) throw new Error(`No se pudo obtener usuario existente: ${email}`);
      await upsertProfile(existing.id, email, fullName, role);
    } else {
      throw error;
    }
  } else {
    await upsertProfile(data.user.id, email, fullName, role);
  }

  console.log(`  ✓ ${role} listo`);
}

async function main() {
  console.log("\n=== Creando usuarios kiosk ===\n");

  for (const user of KIOSK_USERS) {
    await createKioskUser(user.email, user.fullName, user.role);
  }

  await prisma.$disconnect();

  console.log("\n=== Usuarios kiosk creados ===");
  console.log("\nURLs de auto-login (reemplaza HOST y SECRET):");
  for (const user of KIOSK_USERS) {
    console.log(`  ${user.role.padEnd(16)} → https://HOST/api/kiosk/auth?role=${user.role}&key=SECRET`);
  }
  console.log("");
}

main().catch((e) => {
  console.error("✗ Error:", e.message);
  process.exit(1);
});
