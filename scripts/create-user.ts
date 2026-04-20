/**
 * Script para crear un usuario en Supabase Auth + su fila en `profiles`.
 *
 * Uso:
 *   npx tsx scripts/create-user.ts --email admin@tuxpenos.com --password tuxpenos2026 --name "Administrador" --role OPERACIONES
 *
 * Parametros:
 *   --email      Email del usuario
 *   --password   Password del usuario
 *   --name       Nombre completo visible en la app
 *   --role       OPERACIONES | COCINA | CHOFER | SURTIDOR_AGUAS | HIELERA | INSUMOS
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "@prisma/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

const VALID_ROLES: Role[] = [
  "OPERACIONES",
  "COCINA",
  "CHOFER",
  "SURTIDOR_AGUAS",
  "HIELERA",
  "INSUMOS",
];

type CliOptions = {
  email: string;
  password: string;
  fullName: string;
  role: Role;
};

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

function printUsage() {
  console.log(`
Uso:
  npx tsx scripts/create-user.ts --email admin@tuxpenos.com --password tuxpenos2026 --name "Administrador" --role OPERACIONES

Roles validos:
  ${VALID_ROLES.join(", ")}
`);
}

function parseArgs(argv: string[]): Partial<CliOptions> & { help?: boolean } {
  const parsed: Partial<CliOptions> & { help?: boolean } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (!next) continue;

    if (arg === "--email") {
      parsed.email = next;
      index += 1;
      continue;
    }

    if (arg === "--password") {
      parsed.password = next;
      index += 1;
      continue;
    }

    if (arg === "--name") {
      parsed.fullName = next;
      index += 1;
      continue;
    }

    if (arg === "--role") {
      parsed.role = next as Role;
      index += 1;
    }
  }

  return parsed;
}

function resolveOptions(): CliOptions {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    printUsage();
    process.exit(0);
  }

  if (!supabaseUrl || !serviceKey || !databaseUrl) {
    throw new Error(
      "Faltan variables de entorno. Revisa NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y DATABASE_URL."
    );
  }

  if (!parsed.email || !parsed.password || !parsed.fullName || !parsed.role) {
    printUsage();
    throw new Error("Debes enviar --email, --password, --name y --role.");
  }

  if (!VALID_ROLES.includes(parsed.role)) {
    throw new Error(`Rol invalido: ${parsed.role}. Usa uno de: ${VALID_ROLES.join(", ")}`);
  }

  return {
    email: parsed.email.trim(),
    password: parsed.password,
    fullName: parsed.fullName.trim(),
    role: parsed.role,
  };
}

async function upsertProfile(input: CliOptions, id: string) {
  await prisma.profile.upsert({
    where: { id },
    update: {
      email: input.email,
      full_name: input.fullName,
      role: input.role,
    },
    create: {
      id,
      email: input.email,
      full_name: input.fullName,
      role: input.role,
    },
  });
  console.log(`Perfil creado/actualizado en DB: ${id}`);
}

async function main() {
  const input = resolveOptions();

  console.log(`\nCreando usuario: ${input.email} (${input.role})...\n`);

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log("El usuario ya existe en Supabase Auth, actualizando perfil...");
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users.find((user) => user.email === input.email);

      if (!existing) {
        throw new Error("No se pudo obtener el usuario existente en Supabase Auth.");
      }

      await upsertProfile(input, existing.id);
    } else {
      throw error;
    }
  } else {
    await upsertProfile(input, data.user.id);
  }

  await prisma.$disconnect();

  console.log("\nListo. Puedes iniciar sesion con:");
  console.log(`  Email:      ${input.email}`);
  console.log(`  Contrasena: ${input.password}`);
  console.log("  URL:        http://localhost:3000/login\n");
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
