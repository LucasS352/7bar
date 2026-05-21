"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HeartPrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartPrismaService = void 0;
const common_1 = require("@nestjs/common");
const heart_client_1 = require("../generated/heart-client");
let HeartPrismaService = HeartPrismaService_1 = class HeartPrismaService extends heart_client_1.PrismaClient {
    constructor() {
        super(...arguments);
        this.logger = new common_1.Logger(HeartPrismaService_1.name);
    }
    async onModuleInit() {
        let retries = 5;
        let delay = 1000;
        while (retries > 0) {
            try {
                await this.$connect();
                this.logger.log('Conexão estabelecida com sucesso com o banco Heart.');
                break;
            }
            catch (err) {
                retries--;
                this.logger.warn(`Falha ao conectar no banco mestre (Heart): ${err.message}. Tentando novamente em ${delay}ms... (${retries} retentativas restantes)`);
                if (retries === 0) {
                    this.logger.error('Não foi possível estabelecer conexão com o banco Heart após 5 tentativas.');
                    throw err;
                }
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.HeartPrismaService = HeartPrismaService;
exports.HeartPrismaService = HeartPrismaService = HeartPrismaService_1 = __decorate([
    (0, common_1.Injectable)()
], HeartPrismaService);
//# sourceMappingURL=heart-prisma.service.js.map