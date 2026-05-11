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
const tenant_context_service_1 = require("../prisma/tenant-context.service");
let CashRegistersService = class CashRegistersService {
    constructor(tenantManager, tenantContext) {
        this.tenantManager = tenantManager;
        this.tenantContext = tenantContext;
    }
    async getPrisma() {
        const { tenantId, databaseUrl } = this.tenantContext.get();
        return this.tenantManager.getTenantClient(tenantId, databaseUrl);
    }
    async openRegister(openingValue, operatorId) {
        try {
            const { userId } = this.tenantContext.get();
            const prisma = await this.getPrisma();
            const currentOpId = operatorId || userId;
            const existing = await prisma.cashRegister.findFirst({
                where: { status: 'open' }
            });
            if (existing) {
                throw new common_1.BadRequestException(`Já existe um caixa aberto (${existing.operatorId === currentOpId ? 'por você' : 'por outro operador'}). Feche-o antes de abrir um novo.`);
            }
            return await prisma.cashRegister.create({
                data: {
                    operatorId: currentOpId,
                    openingValue,
                    status: 'open'
                }
            });
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException(`Erro no banco: ${error.message}`);
        }
    }
    async closeRegister(id, closingValue) {
        const prisma = await this.getPrisma();
        return prisma.cashRegister.update({
            where: { id },
            data: { closingValue, closingTime: new Date(), status: 'closed' }
        });
    }
    async getCurrentRegister() {
        const prisma = await this.getPrisma();
        const current = await prisma.cashRegister.findFirst({
            where: { status: 'open' }
        });
        if (current) {
            return current;
        }
        return null;
    }
    async addMovement(registerId, type, value, reason) {
        const prisma = await this.getPrisma();
        const register = await prisma.cashRegister.findUnique({ where: { id: registerId } });
        if (!register || register.status !== 'open')
            throw new common_1.BadRequestException('Caixa fechado ou inexistente');
        return prisma.cashMovement.create({
            data: { cashRegisterId: registerId, type, value, reason }
        });
    }
    async findAll() {
        const prisma = await this.getPrisma();
        return prisma.cashRegister.findMany({ orderBy: { openingTime: 'desc' } });
    }
    async getReport(id) {
        const prisma = await this.getPrisma();
        const register = await prisma.cashRegister.findUnique({ where: { id } });
        if (!register)
            throw new common_1.BadRequestException('Caixa não encontrado');
        const sales = await prisma.sale.findMany({
            where: { cashRegisterId: id },
            include: { payments: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });
        let totalDinheiro = 0, totalPix = 0, totalCredito = 0, totalDebito = 0;
        sales.forEach(sale => {
            sale.payments.forEach(p => {
                const v = Number(p.value);
                if (p.method === 'dinheiro')
                    totalDinheiro += v;
                else if (p.method === 'pix')
                    totalPix += v;
                else if (p.method === 'credito')
                    totalCredito += v;
                else if (p.method === 'debito')
                    totalDebito += v;
            });
        });
        const movements = await prisma.cashMovement.findMany({
            where: { cashRegisterId: id },
            orderBy: { createdAt: 'desc' }
        });
        let totalSuprimentos = 0, totalSangrias = 0;
        movements.forEach((m) => {
            if (m.type === 'IN')
                totalSuprimentos += Number(m.value);
            if (m.type === 'OUT')
                totalSangrias += Number(m.value);
        });
        const openingValue = Number(register.openingValue);
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
                expectedDinheiro: openingValue + totalDinheiro + totalSuprimentos - totalSangrias,
                salesDetails: sales,
                movements
            }
        };
    }
};
exports.CashRegistersService = CashRegistersService;
exports.CashRegistersService = CashRegistersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_prisma_service_1.TenantConnectionManager,
        tenant_context_service_1.TenantContextService])
], CashRegistersService);
//# sourceMappingURL=cash-registers.service.js.map