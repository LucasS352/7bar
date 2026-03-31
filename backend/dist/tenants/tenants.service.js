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
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const heart_prisma_service_1 = require("../prisma/heart-prisma.service");
let TenantsService = class TenantsService {
    heartPrisma;
    constructor(heartPrisma) {
        this.heartPrisma = heartPrisma;
    }
    findAll() {
        return this.heartPrisma.tenant.findMany({ include: { users: true } });
    }
    create(data) {
        return this.heartPrisma.tenant.create({ data });
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [heart_prisma_service_1.HeartPrismaService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map