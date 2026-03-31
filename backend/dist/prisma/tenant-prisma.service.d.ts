import { OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class TenantConnectionManager implements OnModuleDestroy {
    private clients;
    getTenantClient(tenantId: string, databaseUrl: string): Promise<PrismaClient>;
    onModuleDestroy(): Promise<void>;
}
