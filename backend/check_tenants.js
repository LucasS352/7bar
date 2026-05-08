const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'mysql://root:7bar%402025@localhost:3307/heart' } }
});

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('TENANTS IN HEART DB:', tenants.map(t => t.databaseName));
}
main().finally(() => prisma.$disconnect());
