const { PrismaClient } = require('./node_modules/@prisma/client-heart');
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'mysql://root:@localhost:3307/heart' }
  }
});
prisma.tenant.findMany().then(r => {
  console.log(r);
  process.exit(0);
}).catch(e => console.error(e));
