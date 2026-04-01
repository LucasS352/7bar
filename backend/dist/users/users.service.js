"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const heart_prisma_service_1 = require("../prisma/heart-prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    heartPrisma;
    constructor(heartPrisma) {
        this.heartPrisma = heartPrisma;
    }
    async findAll(tenantId) {
        return this.heartPrisma.user.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' }
        });
    }
    async create(tenantId, data) {
        const usersCount = await this.heartPrisma.user.count({
            where: { tenantId }
        });
        if (usersCount >= 2) {
            throw new common_1.BadRequestException('Limite atingido: O plano atual permite no máximo 2 usuários por loja (1 Admin e 1 Colaborador).');
        }
        if (data.role === 'admin') {
            const adminCount = await this.heartPrisma.user.count({
                where: { tenantId, role: 'admin' }
            });
            if (adminCount >= 1) {
                throw new common_1.BadRequestException('Limite atingido: Já existe 1 Administrador neste sistema.');
            }
        }
        const existingUser = await this.heartPrisma.user.findUnique({
            where: { email: data.email }
        });
        if (existingUser) {
            throw new common_1.BadRequestException('Já existe um usuário cadastrado com este e-mail.');
        }
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.heartPrisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role || 'operator',
                tenantId
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
            }
        });
    }
    async toggleStatus(tenantId, id) {
        const user = await this.heartPrisma.user.findFirst({
            where: { id, tenantId }
        });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado.');
        if (user.role === 'admin')
            throw new common_1.BadRequestException('Não é possível inativar o Administrador principal.');
        return this.heartPrisma.user.update({
            where: { id },
            data: { active: !user.active },
            select: { id: true, active: true }
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [heart_prisma_service_1.HeartPrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map