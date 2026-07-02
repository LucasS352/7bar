import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { HeartPrismaService } from '../prisma/heart-prisma.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(private heartPrisma: HeartPrismaService) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Creates a Prisma client connected to a specific tenant database */
  private createTenantClient(databaseUrl: string) {
    return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  }

  /** Fetches a group and validates it exists, includes members+tenant */
  private async getGroupWithMembers(groupId: string) {
    const group = await this.heartPrisma.tenantGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { tenant: true },
        },
      },
    });
    if (!group) throw new NotFoundException(`Grupo ${groupId} não encontrado`);
    return group;
  }

  // ── Group CRUD ─────────────────────────────────────────────────────────────

  async listGroups() {
    return this.heartPrisma.tenantGroup.findMany({
      include: {
        members: {
          include: { tenant: { select: { id: true, name: true, nomeFantasia: true, razaoSocial: true, status: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createGroup(name: string) {
    if (!name?.trim()) throw new BadRequestException('Nome do grupo é obrigatório');
    return this.heartPrisma.tenantGroup.create({ data: { name: name.trim() } });
  }

  async deleteGroup(groupId: string) {
    await this.getGroupWithMembers(groupId);
    await this.heartPrisma.tenantGroup.delete({ where: { id: groupId } });
    return { success: true };
  }

  // ── Members ────────────────────────────────────────────────────────────────

  async addMember(groupId: string, tenantId: string, alias?: string) {
    await this.getGroupWithMembers(groupId);
    const tenant = await this.heartPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} não encontrado`);
    return this.heartPrisma.tenantGroupMember.upsert({
      where: { groupId_tenantId: { groupId, tenantId } },
      update: { alias: alias ?? null },
      create: { groupId, tenantId, alias: alias ?? null },
    });
  }

  async removeMember(groupId: string, tenantId: string) {
    await this.heartPrisma.tenantGroupMember.deleteMany({ where: { groupId, tenantId } });
    return { success: true };
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard(groupId: string) {
    const group = await this.getGroupWithMembers(groupId);
    const results: any[] = [];

    for (const member of group.members) {
      const client = this.createTenantClient(member.tenant.databaseUrl);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const [salesTodayAgg, salesMonthAgg, salesTodayCount, topProducts] = await Promise.all([
          client.sale.aggregate({
            where: { createdAt: { gte: today }, status: { not: 'cancelled' } },
            _sum: { total: true },
          }),
          client.sale.aggregate({
            where: { createdAt: { gte: monthStart }, status: { not: 'cancelled' } },
            _sum: { total: true },
          }),
          client.sale.count({
            where: { createdAt: { gte: today }, status: { not: 'cancelled' } },
          }),
          client.saleItem.groupBy({
            by: ['productId'],
            where: { sale: { createdAt: { gte: monthStart }, status: { not: 'cancelled' } } },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 10,
          }),
        ]);

        // Enrich top products with names
        const productIds = topProducts.map((p: any) => p.productId);
        const products = await client.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        });
        const productMap = new Map(products.map((p: any) => [p.id, p.name]));

        results.push({
          tenantId: member.tenantId,
          alias: member.alias ?? member.tenant.nomeFantasia ?? member.tenant.name,
          salesToday: Number(salesTodayAgg._sum.total ?? 0),
          salesMonth: Number(salesMonthAgg._sum.total ?? 0),
          countToday: salesTodayCount,
          topProducts: topProducts.map((p: any) => ({
            productId: p.productId,
            name: productMap.get(p.productId) ?? 'Desconhecido',
            totalQty: Number(p._sum.quantity ?? 0),
          })),
        });
      } catch (err: any) {
        this.logger.warn(`Dashboard erro tenant ${member.tenantId}: ${err.message}`);
        results.push({
          tenantId: member.tenantId,
          alias: member.alias ?? member.tenant.nomeFantasia ?? member.tenant.name,
          error: err.message,
          salesToday: 0,
          salesMonth: 0,
          countToday: 0,
          topProducts: [],
        });
      } finally {
        await client.$disconnect();
      }
    }

    return { groupId, groupName: group.name, tenants: results };
  }

  // ── Stock ──────────────────────────────────────────────────────────────────

  async getConsolidatedStock(groupId: string) {
    const group = await this.getGroupWithMembers(groupId);
    // Map: productName -> { tenantId -> qty }
    const stockMap: Record<string, Record<string, any>> = {};
    const tenantLabels: Record<string, string> = {};

    for (const member of group.members) {
      const label = member.alias ?? member.tenant.nomeFantasia ?? member.tenant.name;
      tenantLabels[member.tenantId] = label;
      const client = this.createTenantClient(member.tenant.databaseUrl);
      try {
        const products = await client.product.findMany({
          select: { id: true, name: true, stock: true, unit: true },
          where: { active: true },
        });
        for (const p of products) {
          if (!stockMap[p.name]) stockMap[p.name] = {};
          stockMap[p.name][member.tenantId] = { qty: Number(p.stock ?? 0), productId: p.id, unit: p.unit };
        }
      } catch (err: any) {
        this.logger.warn(`Stock erro tenant ${member.tenantId}: ${err.message}`);
      } finally {
        await client.$disconnect();
      }
    }

    const rows = Object.entries(stockMap).map(([name, tenants]) => ({ name, tenants }));
    return { groupId, groupName: group.name, tenantLabels, rows };
  }

  async stockEntry(
    groupId: string,
    body: { tenantId: string; productId: string; quantity: number; costPrice?: number },
  ) {
    const group = await this.getGroupWithMembers(groupId);
    const member = group.members.find((m) => m.tenantId === body.tenantId);
    if (!member) throw new NotFoundException('Tenant não faz parte deste grupo');

    const client = this.createTenantClient(member.tenant.databaseUrl);
    try {
      const product = await client.product.findUnique({ where: { id: body.productId } });
      if (!product) throw new NotFoundException('Produto não encontrado no tenant');

      const newStock = Number(product.stock ?? 0) + Number(body.quantity);
      await client.product.update({
        where: { id: body.productId },
        data: { stock: newStock },
      });
      await client.inventoryLog.create({
        data: {
          productId: body.productId,
          type: 'entry',
          quantity: Number(body.quantity),
          costPrice: body.costPrice ? Number(body.costPrice) : null,
          notes: 'Entrada via portal grupo multiempresa',
        },
      });
      return { success: true, newStock };
    } finally {
      await client.$disconnect();
    }
  }

  async stockTransfer(
    groupId: string,
    body: { fromTenantId: string; toTenantId: string; productId: string; quantity: number },
  ) {
    const group = await this.getGroupWithMembers(groupId);
    const fromMember = group.members.find((m) => m.tenantId === body.fromTenantId);
    const toMember = group.members.find((m) => m.tenantId === body.toTenantId);
    if (!fromMember) throw new NotFoundException('Tenant de origem não faz parte deste grupo');
    if (!toMember) throw new NotFoundException('Tenant de destino não faz parte deste grupo');

    const fromClient = this.createTenantClient(fromMember.tenant.databaseUrl);
    const toClient = this.createTenantClient(toMember.tenant.databaseUrl);

    try {
      const fromProduct = await fromClient.product.findUnique({ where: { id: body.productId } });
      if (!fromProduct) throw new NotFoundException('Produto não encontrado no tenant de origem');
      if (Number(fromProduct.stock ?? 0) < body.quantity) {
        throw new BadRequestException('Estoque insuficiente para transferência');
      }

      const newFromStock = Number(fromProduct.stock) - body.quantity;
      await fromClient.product.update({ where: { id: body.productId }, data: { stock: newFromStock } });
      await fromClient.inventoryLog.create({
        data: {
          productId: body.productId,
          type: 'transfer_out',
          quantity: -body.quantity,
          notes: `Transferência para tenant ${body.toTenantId}`,
        },
      });

      // Find or create product in destination by name
      const toProduct = await toClient.product.findFirst({ where: { name: fromProduct.name } });
      if (toProduct) {
        const newToStock = Number(toProduct.stock ?? 0) + body.quantity;
        await toClient.product.update({ where: { id: toProduct.id }, data: { stock: newToStock } });
        await toClient.inventoryLog.create({
          data: {
            productId: toProduct.id,
            type: 'transfer_in',
            quantity: body.quantity,
            notes: `Recebimento de transferência do tenant ${body.fromTenantId}`,
          },
        });
      }

      return { success: true, fromNewStock: newFromStock };
    } finally {
      await fromClient.$disconnect();
      await toClient.$disconnect();
    }
  }

  // ── Products ───────────────────────────────────────────────────────────────

  async getGroupProducts(groupId: string) {
    const group = await this.getGroupWithMembers(groupId);
    const allProducts: any[] = [];

    for (const member of group.members) {
      const client = this.createTenantClient(member.tenant.databaseUrl);
      try {
        const products = await client.product.findMany({
          where: { active: true },
          select: { id: true, name: true, priceSell: true, priceCost: true, unit: true, stock: true },
        });
        for (const p of products) {
          allProducts.push({
            ...p,
            priceSell: Number(p.priceSell ?? 0),
            priceCost: Number(p.priceCost ?? 0),
            stock: Number(p.stock ?? 0),
            tenantId: member.tenantId,
            tenantAlias: member.alias ?? member.tenant.nomeFantasia ?? member.tenant.name,
          });
        }
      } catch (err: any) {
        this.logger.warn(`Products erro tenant ${member.tenantId}: ${err.message}`);
      } finally {
        await client.$disconnect();
      }
    }

    return { groupId, groupName: group.name, products: allProducts };
  }

  async createProductAllTenants(
    groupId: string,
    body: { name: string; priceSell: number; priceCost: number; unit: string; categoryName: string },
  ) {
    const group = await this.getGroupWithMembers(groupId);
    const results: any[] = [];

    for (const member of group.members) {
      const client = this.createTenantClient(member.tenant.databaseUrl);
      try {
        // Find or create category
        let category = await client.category.findFirst({ where: { name: body.categoryName } });
        if (!category) {
          category = await client.category.create({ data: { name: body.categoryName } });
        }

        const product = await client.product.upsert({
          where: { name: body.name } as any,
          update: { priceSell: body.priceSell, priceCost: body.priceCost, unit: body.unit },
          create: {
            name: body.name,
            priceSell: body.priceSell,
            priceCost: body.priceCost,
            unit: body.unit,
            categoryId: category.id,
            stock: 0,
          },
        });

        results.push({ tenantId: member.tenantId, success: true, productId: product.id });
      } catch (err: any) {
        this.logger.warn(`CreateProduct erro tenant ${member.tenantId}: ${err.message}`);
        results.push({ tenantId: member.tenantId, success: false, error: err.message });
      } finally {
        await client.$disconnect();
      }
    }

    return { groupId, results };
  }

  async updatePriceAllTenants(
    groupId: string,
    body: { productName: string; priceSell: number },
  ) {
    const group = await this.getGroupWithMembers(groupId);
    const results: any[] = [];

    for (const member of group.members) {
      const client = this.createTenantClient(member.tenant.databaseUrl);
      try {
        const updated = await client.product.updateMany({
          where: { name: body.productName },
          data: { priceSell: body.priceSell },
        });
        results.push({ tenantId: member.tenantId, success: true, updatedCount: updated.count });
      } catch (err: any) {
        this.logger.warn(`UpdatePrice erro tenant ${member.tenantId}: ${err.message}`);
        results.push({ tenantId: member.tenantId, success: false, error: err.message });
      } finally {
        await client.$disconnect();
      }
    }

    return { groupId, results };
  }

  // ── Group Owner User Management ────────────────────────────────────────────

  async createGroupOwnerUser(
    groupId: string,
    body: { name: string; email: string; password: string },
  ) {
    const group = await this.getGroupWithMembers(groupId);
    if (!group.members.length) throw new BadRequestException('Grupo sem empresas vinculadas');

    // Usa o primeiro tenant do grupo como "tenant de hospedagem" do usuário
    const hostTenantId = group.members[0].tenantId;

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const user = await this.heartPrisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: 'group_owner',
        tenantId: hostTenantId,
        groupId,
      },
      select: { id: true, name: true, email: true, role: true, groupId: true, createdAt: true },
    });

    return user;
  }

  async getGroupUsers(groupId: string) {
    await this.getGroupWithMembers(groupId);
    return this.heartPrisma.user.findMany({
      where: { groupId },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
  }

  async deleteGroupUser(groupId: string, userId: string) {
    const user = await this.heartPrisma.user.findFirst({ where: { id: userId, groupId } });
    if (!user) throw new NotFoundException('Usuário não encontrado neste grupo');
    await this.heartPrisma.user.delete({ where: { id: userId } });
    return { success: true };
  }
}
