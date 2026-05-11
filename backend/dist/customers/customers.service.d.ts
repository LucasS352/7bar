import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
export declare class CustomersService {
    private tenantManager;
    private tenantContext;
    constructor(tenantManager: TenantConnectionManager, tenantContext: TenantContextService);
    private getPrisma;
    findAll(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        cpfCnpj: string | null;
        address: string | null;
        reference: string | null;
    }[]>;
    findByPhone(phone: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        cpfCnpj: string | null;
        address: string | null;
        reference: string | null;
    } | null>;
    create(data: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        cpfCnpj: string | null;
        address: string | null;
        reference: string | null;
    }>;
}
