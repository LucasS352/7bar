import { Injectable } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';

@Injectable()
export class ProductsService {
  constructor(private tenantManager: TenantConnectionManager) {}

  async findAll(tenantId: string, databaseUrl: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.product.findMany({
      include: { category: true }
    });
  }

  async create(tenantId: string, databaseUrl: string, data: any) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);

    if (!data.shortCode) {
      const allProducts = await prisma.product.findMany({ select: { shortCode: true } });
      let maxNum = 0;
      allProducts.forEach(p => {
        const num = parseInt(p.shortCode || '0', 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });
      data.shortCode = (maxNum + 1).toString();
    }

    if (!data.barcode) data.barcode = null;
    
    const product = await prisma.product.create({ data });

    if (data.stock && data.stock > 0) {
      // Cast para bypassar lock de tipagem no SO durante hot-reload
      await (prisma as any).inventoryLog.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: data.stock,
          costPrice: data.priceCost,
          reason: 'Estoque Inicial Cadastro Manual'
        }
      });
    }

    return product;
  }

  async update(tenantId: string, databaseUrl: string, id: string, data: any) {
    if (data.shortCode === '') data.shortCode = null;
    if (data.barcode === '') data.barcode = null;

    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const oldProduct = await prisma.product.findUnique({ where: { id } });
    const product = await prisma.product.update({ where: { id }, data });

    if (data.stock !== undefined && oldProduct && data.stock !== oldProduct.stock) {
        const diff = data.stock - oldProduct.stock;
        await (prisma as any).inventoryLog.create({
          data: {
             productId: product.id,
             type: diff > 0 ? 'IN' : 'OUT',
             quantity: Math.abs(diff),
             reason: diff > 0 ? 'Ajuste Manual Positivo' : 'Ajuste Manual (Quebra/Perda)'
          }
        });
    }

    return product;
  }

  async remove(tenantId: string, databaseUrl: string, id: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    // Limpar logs por restrição de FK
    await (prisma as any).inventoryLog.deleteMany({ where: { productId: id } });
    return prisma.product.delete({ where: { id } });
  }

  async bulkEntry(tenantId: string, databaseUrl: string, items: any[]) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    let importedCount = 0;
    
    let fallbackCategory = await prisma.category.findFirst();
    if (!fallbackCategory) {
      fallbackCategory = await prisma.category.create({ data: { name: 'Geral' } });
    }

    for (const item of items) {
      if (!item.name) continue; 

      let existing = null;
      if (item.shortCode) existing = await prisma.product.findUnique({ where: { shortCode: item.shortCode } });
      if (!existing && item.barcode) existing = await prisma.product.findUnique({ where: { barcode: item.barcode } });

      const safeShortCode = item.shortCode || null;
      const safeBarcode = item.barcode || null;
      const stockToAdd = parseInt(item.stockToAdd) || 0;

      if (existing) {
         const updated = await prisma.product.update({ 
           where: { id: existing.id }, 
           data: { 
             priceCost: item.priceCost ?? existing.priceCost, 
             priceSell: item.priceSell ?? existing.priceSell,
             stock: existing.stock + stockToAdd
           } 
         });
         
         if (stockToAdd > 0) {
           await (prisma as any).inventoryLog.create({
             data: { productId: existing.id, type: 'IN', quantity: stockToAdd, costPrice: item.priceCost, reason: 'Entrada Lote/Fornecedor' }
           });
         }
         importedCount++;
      } else {
         let finalShortCode = safeShortCode;
         if (!finalShortCode) {
            const allProducts = await prisma.product.findMany({ select: { shortCode: true } });
            let maxNum = 0;
            allProducts.forEach(p => {
               const num = parseInt(p.shortCode || '0', 10);
               if (!isNaN(num) && num > maxNum) maxNum = num;
            });
            finalShortCode = (maxNum + 1).toString();
         }

         const created = await prisma.product.create({
           data: {
             name: item.name,
             shortCode: finalShortCode,
             barcode: safeBarcode,
             priceCost: item.priceCost || 0,
             priceSell: item.priceSell || 0,
             stock: stockToAdd,
             categoryId: item.categoryId || fallbackCategory.id
           }
         });
         
         if (stockToAdd > 0) {
            await (prisma as any).inventoryLog.create({
              data: { productId: created.id, type: 'IN', quantity: stockToAdd, costPrice: item.priceCost, reason: 'Cadastro e Entrada Lote Inicial' }
            });
         }
         importedCount++;
      }
    }
    return { success: true, processed: importedCount };
  }
}
