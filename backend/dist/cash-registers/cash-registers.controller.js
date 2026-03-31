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
exports.CashRegistersController = void 0;
const common_1 = require("@nestjs/common");
const cash_registers_service_1 = require("./cash-registers.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let CashRegistersController = class CashRegistersController {
    cashRegistersService;
    constructor(cashRegistersService) {
        this.cashRegistersService = cashRegistersService;
    }
    open(user, openingValue) {
        return this.cashRegistersService.openRegister(user.tenantId, user.databaseUrl, user.userId, openingValue || 0);
    }
    findAll(user) {
        return this.cashRegistersService.findAll(user.tenantId, user.databaseUrl);
    }
    close(user, id, closingValue) {
        return this.cashRegistersService.closeRegister(user.tenantId, user.databaseUrl, id, closingValue);
    }
    addMovement(user, id, body) {
        return this.cashRegistersService.addMovement(user.tenantId, user.databaseUrl, id, body.type, body.value, body.reason);
    }
    getReport(user, id) {
        return this.cashRegistersService.getReport(user.tenantId, user.databaseUrl, id);
    }
    getCurrent(user) {
        return this.cashRegistersService.getCurrentRegister(user.tenantId, user.databaseUrl, user.userId);
    }
};
exports.CashRegistersController = CashRegistersController;
__decorate([
    (0, common_1.Post)('open'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('openingValue')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "open", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('closingValue')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number]),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "close", null);
__decorate([
    (0, common_1.Post)(':id/movement'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "addMovement", null);
__decorate([
    (0, common_1.Get)(':id/report'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "getReport", null);
__decorate([
    (0, common_1.Get)('current'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "getCurrent", null);
exports.CashRegistersController = CashRegistersController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('cash-registers'),
    __metadata("design:paramtypes", [cash_registers_service_1.CashRegistersService])
], CashRegistersController);
//# sourceMappingURL=cash-registers.controller.js.map