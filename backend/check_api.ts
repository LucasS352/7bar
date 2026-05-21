import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:7bar@2025@localhost:3308/lucas"
    }
  }
});

async function main() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { 
      category: true, 
      grupoTributacao: true,
      modifierGroups: {
        include: {
          options: {
            include: {
              componentProduct: true
            }
          }
        }
      }
    },
  });

  const serialized = JSON.parse(JSON.stringify(products));
  const cigarroSolto = serialized.find((p: any) => p.name.includes("Cigarro solto"));
  console.log("=== SERIALIZED CIGARRO SOLTO ===");
  console.log(JSON.stringify(cigarroSolto, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
