"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const tenant_prisma_service_1 = require("../prisma/tenant-prisma.service");
let SalesService = class SalesService {
    tenantManager;
    constructor(tenantManager) {
        this.tenantManager = tenantManager;
    }
    async checkout(tenantId, databaseUrl, data) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        return prisma.$transaction(async (tx) => {
            let total = 0;
            for (const item of data.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product || product.stock < item.quantity) {
                    throw new common_1.BadRequestException(`Estoque insuficiente para o produto: ${product?.name ?? 'desconhecido'}`);
                }
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } }
                });
                total += item.priceUnit * item.quantity;
            }
            const sale = await tx.sale.create({
                data: {
                    customerId: data.customerId || null,
                    total: total - (data.discount || 0),
                    discount: data.discount || 0,
                    status: 'completed',
                    ...(data.customerCpf && { customerCpf: data.customerCpf }),
                    ...(data.customerName && { customerName: data.customerName }),
                    ...(data.nfeStatus && { nfeStatus: data.nfeStatus }),
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            priceUnit: item.priceUnit,
                            subtotal: item.priceUnit * item.quantity
                        }))
                    },
                    payments: {
                        create: data.payments.map((pay) => ({
                            method: pay.method,
                            value: pay.value
                        }))
                    }
                },
                include: { items: true, payments: true }
            });
            return sale;
        });
    }
    async findAll(tenantId, databaseUrl) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        return prisma.sale.findMany({
            include: {
                payments: true,
                items: { include: { product: true } },
                customer: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async getTodaySales(tenantId, databaseUrl) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return prisma.sale.findMany({
            where: {
                createdAt: { gte: today }
            },
            include: {
                payments: true,
                items: { include: { product: true } },
                customer: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_prisma_service_1.TenantConnectionManager])
], SalesService);
//# sourceMappingURL=sales.service.js.map