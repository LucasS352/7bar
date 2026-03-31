import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
export declare class CustomersService {
    private tenantManager;
    constructor(tenantManager: TenantConnectionManager);
    findAll(tenantId: string, databaseUrl: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        address: string | null;
        reference: string | null;
    }[]>;
    findByPhone(tenantId: string, databaseUrl: string, phone: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        address: string | null;
        reference: string | null;
    } | null>;
    create(tenantId: string, databaseUrl: string, data: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        address: string | null;
        reference: string | null;
    }>;
}
