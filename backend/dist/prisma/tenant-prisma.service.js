"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TenantConnectionManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantConnectionManager = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let TenantConnectionManager = TenantConnectionManager_1 = class TenantConnectionManager {
    constructor() {
        this.logger = new common_1.Logger(TenantConnectionManager_1.name);
        this.clients = new Map();
        this.MAX_CLIENTS = 100;
        this.IDLE_TIMEOUT = 30 * 60 * 1000;
    }
    async getTenantClient(tenantId, databaseUrl) {
        this.runCleanup();
        if (this.clients.has(tenantId)) {
            const entry = this.clients.get(tenantId);
            entry.lastUsed = Date.now();
            return entry.client;
        }
        if (this.clients.size >= this.MAX_CLIENTS) {
            this.evictOldest();
        }
        const url = new URL(databaseUrl);
        url.searchParams.set('connection_limit', '3');
        url.searchParams.set('pool_timeout', '20');
        const optimizedUrl = url.toString();
        this.logger.log(`Iniciando novo Pool Prisma para Tenant: ${tenantId} (limit=3)`);
        const client = new client_1.PrismaClient({
            datasources: {
                db: {
                    url: optimizedUrl,
                },
            },
        });
        try {
            await client.$connect();
            this.clients.set(tenantId, { client, lastUsed: Date.now() });
            return client;
        }
        catch (error) {
            this.logger.error(`Falha ao conectar no banco do tenant ${tenantId}: ${error.message}`);
            throw error;
        }
    }
    runCleanup() {
        const now = Date.now();
        for (const [id, entry] of this.clients.entries()) {
            if (now - entry.lastUsed > this.IDLE_TIMEOUT) {
                this.logger.log(`Limpando conexão ociosa do Tenant: ${id}`);
                entry.client.$disconnect().catch(() => { });
                this.clients.delete(id);
            }
        }
    }
    evictOldest() {
        let oldestId = null;
        let oldestTime = Infinity;
        for (const [id, entry] of this.clients.entries()) {
            if (entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                oldestId = id;
            }
        }
        if (oldestId) {
            this.logger.log(`Limite de cache atingido. Removendo cliente mais antigo: ${oldestId}`);
            const entry = this.clients.get(oldestId);
            entry.client.$disconnect().catch(() => { });
            this.clients.delete(oldestId);
        }
    }
    async onModuleDestroy() {
        this.logger.log('Encerrando todas as conexões de tenants...');
        const disconnectPromises = Array.from(this.clients.values()).map((entry) => entry.client.$disconnect());
        await Promise.all(disconnectPromises);
        this.clients.clear();
    }
};
exports.TenantConnectionManager = TenantConnectionManager;
exports.TenantConnectionManager = TenantConnectionManager = TenantConnectionManager_1 = __decorate([
    (0, common_1.Injectable)()
], TenantConnectionManager);
//# sourceMappingURL=tenant-prisma.service.js.map