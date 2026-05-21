import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:7bar@2025@localhost:3308/lucas"
    }
  }
});

async function main() {
  console.log("=== CHECKING SPECIFIC PRODUCTS FOR LUCAS ===");
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'Eigth' } },
        { name: { contains: 'Cigarro' } }
      ]
    },
    include: {
      modifierGroups: {
        include: {
          options: true
        }
      }
    }
  });

  for (const p of products) {
    console.log(`Product: ${p.name} (ID: ${p.id})`);
    console.log(`  isComposite: ${p.isComposite}`);
    console.log(`  stock: ${p.stock}`);
    console.log(`  volumeCapacity: ${p.volumeCapacity}`);
    console.log(`  barcode: ${p.barcode}`);
    console.log(`  shortCode: ${p.shortCode}`);
    if (p.modifierGroups.length > 0) {
      console.log(`  Modifier Groups:`);
      for (const g of p.modifierGroups) {
        console.log(`    - Group: ${g.name} (ID: ${g.id})`);
        for (const o of g.options) {
          console.log(`      * Option: ${o.name} (ID: ${o.id}) -> componentProductId: ${o.componentProductId}, quantity: ${o.quantity}, priceAdjustment: ${o.priceAdjustment}`);
        }
      }
    }
  }

  console.log("\n=== CHECKING RECENT SALES WITH CIGARRO/EIGTH ===");
  const sales = await prisma.sale.findMany({
    where: {
      items: {
        some: {
          productName: { contains: 'Cigarro' }
        }
      }
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          modifiers: true
        }
      }
    }
  });

  for (const s of sales) {
    console.log(`Sale: ID ${s.id}, total: ${s.total}, date: ${s.createdAt}`);
    for (const item of s.items) {
      console.log(`  - Item: ${item.productName} (quantity: ${item.quantity}, price: ${item.priceUnit})`);
      if (item.modifiers.length > 0) {
        console.log(`    Modifiers:`);
        for (const m of item.modifiers) {
          console.log(`      * ${m.name} (quantity: ${m.quantity}, priceAdjustment: ${m.priceAdjustment}, componentProductId: ${m.componentProductId})`);
        }
      }
    }
  }

  console.log("\n=== CHECKING RECENT INVENTORY LOGS FOR CIGARRO/EIGTH ===");
  const logs = await prisma.inventoryLog.findMany({
    where: {
      product: {
        name: { contains: 'Eigth' }
      }
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      product: true
    }
  });

  for (const log of logs) {
    console.log(`Log: product: ${log.product.name}, type: ${log.type}, quantity: ${log.quantity}, reason: ${log.reason}, date: ${log.createdAt}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
