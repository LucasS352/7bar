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
var NfceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NfceService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let NfceService = NfceService_1 = class NfceService {
    constructor(httpService) {
        this.httpService = httpService;
        this.logger = new common_1.Logger(NfceService_1.name);
    }
    async emitir(payload) {
        const serviceUrl = process.env.NFCE_SERVICE_URL || 'http://nfce-service:8080';
        if (payload.ambiente === 1) {
            this.logger.warn('Tentativa de emissão em PRODUÇÃO bloqueada — use ambiente 2 (Homologação) para testes.');
            throw new common_1.BadGatewayException('Emissão em produção não habilitada neste ambiente. Configure nfceAmbiente=2.');
        }
        this.logger.log(`Enviando NFC-e ao microsserviço PHP: ${serviceUrl}/emitir`);
        try {
            const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${serviceUrl}/emitir`, payload, {
                timeout: 30_000,
            }));
            this.logger.log(`NFC-e resultado: ${data.status} | chave: ${data.chave ?? 'N/A'}`);
            return data;
        }
        catch (err) {
            const msg = err?.response?.data?.motivoRejeicao || err?.response?.data?.message || err.message || 'Erro de comunicação com serviço NFC-e';
            this.logger.error(`Falha ao emitir NFC-e: ${msg}`);
            return {
                status: 'erro',
                motivoRejeicao: msg,
            };
        }
    }
    async healthCheck() {
        const serviceUrl = process.env.NFCE_SERVICE_URL || 'http://nfce-service:8080';
        try {
            await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${serviceUrl}/status`, { timeout: 5_000 }));
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.NfceService = NfceService;
exports.NfceService = NfceService = NfceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], NfceService);
//# sourceMappingURL=nfce.service.js.map