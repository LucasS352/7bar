import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
export declare class CategoriesService {
    private tenantManager;
    constructor(tenantManager: TenantConnectionManager);
    findAll(tenantId: string, databaseUrl: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(tenantId: string, databaseUrl: string, data: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
