"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantConnectionManager = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let TenantConnectionManager = class TenantConnectionManager {
    clients = new Map();
    async getTenantClient(tenantId, databaseUrl) {
        if (this.clients.has(tenantId)) {
            return this.clients.get(tenantId);
        }
        const client = new client_1.PrismaClient({
            datasources: {
                db: {
                    url: databaseUrl,
                },
            },
        });
        await client.$connect();
        this.clients.set(tenantId, client);
        return client;
    }
    async onModuleDestroy() {
        const disconnectPromises = Array.from(this.clients.values()).map((client) => client.$disconnect());
        await Promise.all(disconnectPromises);
        this.clients.clear();
    }
};
exports.TenantConnectionManager = TenantConnectionManager;
exports.TenantConnectionManager = TenantConnectionManager = __decorate([
    (0, common_1.Injectable)()
], TenantConnectionManager);
//# sourceMappingURL=tenant-prisma.service.js.map