const { PrismaClient } = require('./src/generated/heart-client');
const fs = require('fs');

async function main() {
  const prisma = new PrismaClient();
  const tenants = await prisma.tenant.findMany({
    include: { users: true }
  });
  fs.writeFileSync('tenants-debug.json', JSON.stringify(tenants, null, 2));
  console.log('Done');
}
main().catch(console.error);
