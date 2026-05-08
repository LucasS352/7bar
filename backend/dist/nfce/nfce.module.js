"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NfceModule = void 0;
const common_1 = require("@nestjs/common");
const nfce_service_1 = require("./nfce.service");
const nfce_controller_1 = require("./nfce.controller");
const axios_1 = require("@nestjs/axios");
let NfceModule = class NfceModule {
};
exports.NfceModule = NfceModule;
exports.NfceModule = NfceModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule],
        controllers: [nfce_controller_1.NfceController],
        providers: [nfce_service_1.NfceService],
        exports: [nfce_service_1.NfceService],
    })
], NfceModule);
//# sourceMappingURL=nfce.module.js.map