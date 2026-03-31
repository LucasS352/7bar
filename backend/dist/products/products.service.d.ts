import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
export declare class ProductsService {
    private tenantManager;
    constructor(tenantManager: TenantConnectionManager);
    findAll(tenantId: string, databaseUrl: string): Promise<({
        category: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        priceCost: number;
        priceSell: number;
        stock: number;
        barcode: string | null;
        shortCode: string | null;
        active: boolean;
        ncm: string | null;
        cfop: string | null;
        cest: string | null;
    })[]>;
    create(tenantId: string, databaseUrl: string, data: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        priceCost: number;
        priceSell: number;
        stock: number;
        barcode: string | null;
        shortCode: string | null;
        active: boolean;
        ncm: string | null;
        cfop: string | null;
        cest: string | null;
    }>;
    update(tenantId: string, databaseUrl: string, id: string, data: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        priceCost: number;
        priceSell: number;
        stock: number;
        barcode: string | null;
        shortCode: string | null;
        active: boolean;
        ncm: string | null;
        cfop: string | null;
        cest: string | null;
    }>;
    remove(tenantId: string, databaseUrl: string, id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        priceCost: number;
        priceSell: number;
        stock: number;
        barcode: string | null;
        shortCode: string | null;
        active: boolean;
        ncm: string | null;
        cfop: string | null;
        cest: string | null;
    }>;
    bulkEntry(tenantId: string, databaseUrl: string, items: any[]): Promise<{
        success: boolean;
        processed: number;
    }>;
}
