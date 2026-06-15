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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const tenant_prisma_service_1 = require("../prisma/tenant-prisma.service");
const tenant_context_service_1 = require("../prisma/tenant-context.service");
let CategoriesService = class CategoriesService {
    constructor(tenantManager, tenantContext) {
        this.tenantManager = tenantManager;
        this.tenantContext = tenantContext;
    }
    async getPrisma() {
        const { tenantId, databaseUrl } = this.tenantContext.get();
        return this.tenantManager.getTenantClient(tenantId, databaseUrl);
    }
    async findAll() {
        const prisma = await this.getPrisma();
        return prisma.category.findMany({
            include: { grupoTributacao: true }
        });
    }
    async create(data) {
        const prisma = await this.getPrisma();
        return prisma.category.create({
            data: {
                name: data.name,
                grupoTributacaoId: data.grupoTributacaoId || null
            }
        });
    }
    async update(id, data) {
        const prisma = await this.getPrisma();
        return prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                grupoTributacaoId: data.grupoTributacaoId !== undefined ? (data.grupoTributacaoId || null) : undefined
            }
        });
    }
    async remove(id) {
        const prisma = await this.getPrisma();
        const products = await prisma.product.findFirst({ where: { categoryId: id } });
        if (products) {
            throw new Error('Não é possível excluir uma categoria que possui produtos vinculados.');
        }
        return prisma.category.delete({ where: { id } });
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_prisma_service_1.TenantConnectionManager,
        tenant_context_service_1.TenantContextService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map