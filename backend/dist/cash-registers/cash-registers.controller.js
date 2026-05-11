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
let CashRegistersController = class CashRegistersController {
    constructor(cashRegistersService) {
        this.cashRegistersService = cashRegistersService;
    }
    open(body) {
        return this.cashRegistersService.openRegister(body.openingValue || 0, body.operatorId);
    }
    findAll() {
        return this.cashRegistersService.findAll();
    }
    close(id, closingValue) {
        return this.cashRegistersService.closeRegister(id, closingValue);
    }
    addMovement(id, body) {
        return this.cashRegistersService.addMovement(id, body.type, body.value, body.reason);
    }
    getReport(id) {
        return this.cashRegistersService.getReport(id);
    }
    getCurrent() {
        return this.cashRegistersService.getCurrentRegister();
    }
};
exports.CashRegistersController = CashRegistersController;
__decorate([
    (0, common_1.Post)('open'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "open", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('closingValue')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "close", null);
__decorate([
    (0, common_1.Post)(':id/movement'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "addMovement", null);
__decorate([
    (0, common_1.Get)(':id/report'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "getReport", null);
__decorate([
    (0, common_1.Get)('current'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CashRegistersController.prototype, "getCurrent", null);
exports.CashRegistersController = CashRegistersController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('cash-registers'),
    __metadata("design:paramtypes", [cash_registers_service_1.CashRegistersService])
], CashRegistersController);
//# sourceMappingURL=cash-registers.controller.js.map