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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsController = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const platform_express_1 = require("@nestjs/platform-express");
const tenants_service_1 = require("./tenants.service");
const provision_tenant_dto_1 = require("./provision-tenant.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let TenantsController = class TenantsController {
    constructor(tenantsService) {
        this.tenantsService = tenantsService;
    }
    findAll(req) {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            throw new common_1.UnauthorizedException('Somente admins podem listar empresas SaaS');
        }
        return this.tenantsService.findAll();
    }
    getMe(req) {
        return this.tenantsService.findById(req.user.tenantId);
    }
    updateMe(req, body) {
        if (req.user.role !== 'admin') {
            throw new common_1.UnauthorizedException('Somente Gerentes podem alterar configurações da empresa.');
        }
        return this.tenantsService.updateTenant(req.user.tenantId, body);
    }
    updateTenant(req, id, body) {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            throw new common_1.UnauthorizedException('Permissão negada.');
        }
        return this.tenantsService.updateTenant(id, body);
    }
    async uploadCertificado(req, file, body) {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            throw new common_1.UnauthorizedException('Permissão negada.');
        }
        if (!file)
            throw new common_1.BadRequestException('Arquivo .pfx não enviado.');
        if (!body.certSenha)
            throw new common_1.BadRequestException('Senha do certificado não informada.');
        return this.tenantsService.uploadCertificado(req.user.tenantId, file.buffer, body.certSenha);
    }
    async uploadLogo(req, id, file) {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            throw new common_1.UnauthorizedException('Permissão negada.');
        }
        if (!file)
            throw new common_1.BadRequestException('Arquivo não enviado.');
        return this.tenantsService.uploadLogo(id, file);
    }
    serveLogo(filename, res) {
        const filePath = (0, path_1.join)(process.cwd(), 'uploads/logos', filename);
        if (!(0, fs_1.existsSync)(filePath)) {
            res.status(404).send('Logo not found');
            return;
        }
        const file = (0, fs_1.createReadStream)(filePath);
        file.pipe(res);
    }
    create(req, body) {
        if (req.user.role !== 'superadmin') {
            throw new common_1.UnauthorizedException('Somente superadmins podem criar empresas SaaS');
        }
        return this.tenantsService.create(body);
    }
    async setup(body) {
        return this.tenantsService.provisionTenant(body);
    }
    async validatePin(body) {
        const valid = await this.tenantsService.validatePin(body.pin);
        if (!valid)
            throw new common_1.UnauthorizedException('PIN inválido.');
        return { valid: true };
    }
};
exports.TenantsController = TenantsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "findAll", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "getMe", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('me'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "updateMe", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "updateTenant", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('me/certificado'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('certPfx')),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "uploadCertificado", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/logo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('logo')),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "uploadLogo", null);
__decorate([
    (0, common_1.Get)('uploads/logos/:filename'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "serveLogo", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('setup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [provision_tenant_dto_1.ProvisionTenantDto]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "setup", null);
__decorate([
    (0, common_1.Post)('setup/validate-pin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "validatePin", null);
exports.TenantsController = TenantsController = __decorate([
    (0, common_1.Controller)('tenants'),
    __metadata("design:paramtypes", [tenants_service_1.TenantsService])
], TenantsController);
//# sourceMappingURL=tenants.controller.js.map