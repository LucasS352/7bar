import { PrismaClient } from '../../node_modules/@prisma/client-heart';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('123456', 10);
  
  const tenant = await prisma.tenant.create({
    data: {
      name: '7bar',
      database_name: '7bar',
      database_url: `mysql://root:${process.env.MYSQL_ROOT_PASSWORD || '7bar@2025'}@mysql:3306/7bar`,
      status: 'active',
      users: {
        create: {
          name: 'Lucas Souza',
          email: 'admin@7bar.com.br',
          password,
          role: 'admin'
        }
      }
    }
  });

  console.log('Seed created successfully:');
  console.log(tenant);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
