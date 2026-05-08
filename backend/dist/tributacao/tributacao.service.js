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
exports.TributacaoService = void 0;
const common_1 = require("@nestjs/common");
const tenant_prisma_service_1 = require("../prisma/tenant-prisma.service");
let TributacaoService = class TributacaoService {
    constructor(tenantManager) {
        this.tenantManager = tenantManager;
    }
    async findAll(tenantId, databaseUrl) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        return prisma.grupoTributacao.findMany({
            orderBy: { nome: 'asc' },
        });
    }
    async findOne(tenantId, databaseUrl, id) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        const grupo = await prisma.grupoTributacao.findUnique({ where: { id } });
        if (!grupo)
            throw new common_1.NotFoundException(`Grupo tributário ${id} não encontrado.`);
        return grupo;
    }
    async create(tenantId, databaseUrl, data) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        return prisma.grupoTributacao.create({ data });
    }
    async update(tenantId, databaseUrl, id, data) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        return prisma.grupoTributacao.update({ where: { id }, data });
    }
    async remove(tenantId, databaseUrl, id) {
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        const count = await prisma.product.count({
            where: { grupoTributacaoId: id },
        });
        if (count > 0) {
            throw new common_1.BadRequestException(`Não é possível remover: ${count} produto(s) vinculados a este grupo.`);
        }
        return prisma.grupoTributacao.delete({ where: { id } });
    }
};
exports.TributacaoService = TributacaoService;
exports.TributacaoService = TributacaoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_prisma_service_1.TenantConnectionManager])
], TributacaoService);
//# sourceMappingURL=tributacao.service.js.map