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
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const sales_service_1 = require("./sales.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let SalesController = class SalesController {
    constructor(salesService) {
        this.salesService = salesService;
    }
    checkout(req, body) {
        return this.salesService.checkout(req.user.tenantId, req.user.databaseUrl, req.user.sub, body);
    }
    findAll(req) {
        return this.salesService.findAll(req.user.tenantId, req.user.databaseUrl);
    }
    getTodaySales(req) {
        return this.salesService.getTodaySales(req.user.tenantId, req.user.databaseUrl);
    }
    getNfceStatus(req, id) {
        return this.salesService.getNfceStatus(req.user.tenantId, req.user.databaseUrl, id);
    }
    emitNfce(req, id) {
        return this.salesService.emitNfce(req.user.tenantId, req.user.databaseUrl, id);
    }
    async exportXmls(req, startDate, endDate, res) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('As datas inicial e final são obrigatórias.');
        }
        const stream = await this.salesService.exportNfceXmls(req.user.tenantId, req.user.databaseUrl, startDate, endDate);
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="xmls_${startDate}_a_${endDate}.zip"`,
        });
        stream.getStream().pipe(res);
    }
};
exports.SalesController = SalesController;
__decorate([
    (0, common_1.Post)('checkout'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "checkout", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('today'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "getTodaySales", null);
__decorate([
    (0, common_1.Get)(':id/nfce-status'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "getNfceStatus", null);
__decorate([
    (0, common_1.Post)(':id/emit-nfce'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "emitNfce", null);
__decorate([
    (0, common_1.Get)('export/xmls'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "exportXmls", null);
exports.SalesController = SalesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('sales'),
    __metadata("design:paramtypes", [sales_service_1.SalesService])
], SalesController);
//# sourceMappingURL=sales.controller.js.map