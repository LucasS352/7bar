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
exports.CashRegistersService = void 0;
const common_1 = require("@nestjs/common");
const tenant_prisma_service_1 = require("../prisma/tenant-prisma.service");
let CashRegistersService = class CashRegistersService {
    tenantManager;
    constructor(tenantManager) {
        this.tenantManager = tenantManager;
    }
    async openRegister(tenantId, databaseUrl, userId, openingValue) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        const existing = await prisma.cashRegister.findFirst({
            where: { userId, status: 'open' }
        });
        if (existing) {
            throw new common_1.BadRequestException('Você já possui um caixa aberto.');
        }
        return prisma.cashRegister.create({
            data: {
                userId,
                openingValue,
                status: 'open'
            }
        });
    }
    async closeRegister(tenantId, databaseUrl, id, closingValue) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        return prisma.cashRegister.update({
            where: { id },
            data: {
                closingValue,
                closingTime: new Date(),
                status: 'closed'
            }
        });
    }
    async getCurrentRegister(tenantId, databaseUrl, userId) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        const current = await prisma.cashRegister.findFirst({
            where: { userId, status: 'open' }
        });
        if (current) {
            const today = new Date();
            if (current.openingTime.getDate() !== today.getDate() ||
                current.openingTime.getMonth() !== today.getMonth() ||
                current.openingTime.getFullYear() !== today.getFullYear()) {
                await prisma.cashRegister.update({
                    where: { id: current.id },
                    data: { status: 'closed', closingTime: new Date() }
                });
                return null;
            }
            return current;
        }
        return null;
    }
    async addMovement(tenantId, databaseUrl, registerId, type, value, reason) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        const register = await prisma.cashRegister.findUnique({ where: { id: registerId } });
        if (!register || register.status !== 'open')
            throw new common_1.BadRequestException('Caixa fechado ou inexistente');
        return prisma.cashMovement.create({
            data: {
                cashRegisterId: registerId,
                type,
                value,
                reason
            }
        });
    }
    async findAll(tenantId, databaseUrl) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        return prisma.cashRegister.findMany({
            orderBy: { openingTime: 'desc' }
        });
    }
    async getReport(tenantId, databaseUrl, id) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        const register = await prisma.cashRegister.findUnique({ where: { id } });
        if (!register)
            throw new common_1.BadRequestException('Caixa não encontrado');
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: register.openingTime, lte: register.closingTime || new Date() }
            },
            include: {
                payments: true,
                items: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        let totalDinheiro = 0, totalPix = 0, totalCredito = 0, totalDebito = 0;
        sales.forEach(sale => {
            sale.payments.forEach(p => {
                if (p.method === 'dinheiro')
                    totalDinheiro += p.value;
                else if (p.method === 'pix')
                    totalPix += p.value;
                else if (p.method === 'credito')
                    totalCredito += p.value;
                else if (p.method === 'debito')
                    totalDebito += p.value;
            });
        });
        const movements = await prisma.cashMovement.findMany({
            where: { cashRegisterId: id },
            orderBy: { createdAt: 'desc' }
        });
        let totalSuprimentos = 0, totalSangrias = 0;
        movements.forEach((m) => {
            if (m.type === 'IN')
                totalSuprimentos += m.value;
            if (m.type === 'OUT')
                totalSangrias += m.value;
        });
        return {
            register,
            report: {
                totalDinheiro,
                totalPix,
                totalCredito,
                totalDebito,
                totalCartao: totalCredito + totalDebito,
                totalVendas: totalDinheiro + totalPix + totalCredito + totalDebito,
                totalSuprimentos,
                totalSangrias,
                countSales: sales.length,
                expectedDinheiro: register.openingValue + totalDinheiro + totalSuprimentos - totalSangrias,
                salesDetails: sales,
                movements
            }
        };
    }
};
exports.CashRegistersService = CashRegistersService;
exports.CashRegistersService = CashRegistersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_prisma_service_1.TenantConnectionManager])
], CashRegistersService);
//# sourceMappingURL=cash-registers.service.js.map