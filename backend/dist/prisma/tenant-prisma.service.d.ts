import { OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class TenantConnectionManager implements OnModuleDestroy {
    private readonly logger;
    private clients;
    private readonly MAX_CLIENTS;
    private readonly IDLE_TIMEOUT;
    getTenantClient(tenantId: string, databaseUrl: string): Promise<PrismaClient>;
    private runCleanup;
    private evictOldest;
    onModuleDestroy(): Promise<void>;
}
