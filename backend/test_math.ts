import { Prisma } from '@prisma/client';

console.log("=== TESTING PRISMA DECIMAL COERCION ===");
try {
  const d = new Prisma.Decimal("0.4900.5");
  console.log("Success! Decimal value:", d.toString());
} catch (e: any) {
  console.log("Failed! Error message:", e.message);
}
