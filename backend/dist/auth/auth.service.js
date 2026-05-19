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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const heart_prisma_service_1 = require("../prisma/heart-prisma.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const tenant_prisma_service_1 = require("../prisma/tenant-prisma.service");
const tenant_context_service_1 = require("../prisma/tenant-context.service");
let AuthService = class AuthService {
    constructor(heartPrisma, jwtService, tenantManager, tenantContext) {
        this.heartPrisma = heartPrisma;
        this.jwtService = jwtService;
        this.tenantManager = tenantManager;
        this.tenantContext = tenantContext;
    }
    async validateUser(email, pass) {
        const user = await this.heartPrisma.user.findUnique({
            where: { email },
            include: { tenant: true },
        });
        if (user && await bcrypt.compare(pass, user.password)) {
            if (!user.active) {
                throw new common_1.UnauthorizedException('Sua conta foi inativada pelo administrador.');
            }
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async validateOperatorPin(tenantId, operatorId, pin) {
        const { databaseUrl } = this.tenantContext.get();
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        const operator = await prisma.operator.findFirst({
            where: { id: operatorId, active: true },
        });
        if (!operator || !operator.pin) {
            throw new common_1.UnauthorizedException('Operador inválido ou PIN não configurado.');
        }
        if (await bcrypt.compare(pin, operator.pin)) {
            return { id: operator.id, name: operator.name, role: 'operator' };
        }
        throw new common_1.UnauthorizedException('PIN incorreto.');
    }
    async login(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: user.tenant.id,
            role: user.role
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                tenant: user.tenant.name
            }
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [heart_prisma_service_1.HeartPrismaService,
        jwt_1.JwtService,
        tenant_prisma_service_1.TenantConnectionManager,
        tenant_context_service_1.TenantContextService])
], AuthService);
//# sourceMappingURL=auth.service.js.map