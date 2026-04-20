import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PUESTOS = [
  "BIMBO",
  "PENI",
  "COMER",
  "FIESTA",
  "AVELLANA",
  "BRISAS",
  "VAQUERO",
  "DIF1",
  "CASINO",
  "MICHO",
  "ISSTE",
  "CENTRAL",
  "ADRIANA",
  "KORAZA",
  "FOVISTE",
  "CIRKO",
  "ST JOHNS",
  "BOMBERO",
  "HOSPI",
  "BANA",
  "ALMENDRO",
];

async function main() {
  console.log("Seeding puestos...");

  for (let i = 0; i < PUESTOS.length; i++) {
    await prisma.puesto.upsert({
      where: { nombre: PUESTOS[i] },
      update: { orden: i + 1 },
      create: {
        nombre: PUESTOS[i],
        orden: i + 1,
        is_active: true,
      },
    });
  }

  console.log(`✓ ${PUESTOS.length} puestos seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
