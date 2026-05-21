import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:7bar@2025@localhost:3308/heart"
    }
  }
});

async function main() {
  console.log("=== CHECKING TENANTS ===");
  const tenants = await prisma.$queryRaw`SELECT * FROM tenants`;
  console.log(tenants);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
