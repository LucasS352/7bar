import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
interface ProductCreateDto {
    name: string;
    shortCode?: string | null;
    barcode?: string | null;
    unit?: string;
    priceCost?: number;
    priceSell: number;
    stock?: number;
    categoryId: string;
    grupoTributacaoId?: string | null;
    ncm?: string | null;
    cest?: string | null;
    origem?: number;
}
interface ProductUpdateDto {
    name?: string;
    shortCode?: string | null;
    barcode?: string | null;
    unit?: string;
    priceCost?: number;
    priceSell?: number;
    stock?: number;
    categoryId?: string;
    grupoTributacaoId?: string | null;
    ncm?: string | null;
    cest?: string | null;
    origem?: number;
    active?: boolean;
}
interface BulkItem {
    name: string;
    shortCode?: string | null;
    barcode?: string | null;
    priceCost?: number;
    priceSell?: number;
    stockToAdd?: number;
    categoryId?: string;
    grupoTributacaoId?: string | null;
    ncm?: string | null;
    cest?: string | null;
    origem?: number;
}
export interface TenantSettingsDto {
    allowNegativeStock: boolean;
}
export declare class ProductsService {
    private tenantManager;
    constructor(tenantManager: TenantConnectionManager);
    private nextShortCode;
    private sanitize;
    findAll(tenantId: string, databaseUrl: string): Promise<({
        category: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
        };
        grupoTributacao: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            nome: string;
            ativo: boolean;
            csosn: string | null;
            cstIcms: string | null;
            cfop: string;
            aliqIcms: import("@prisma/client/runtime/library").Decimal;
            redBcIcms: import("@prisma/client/runtime/library").Decimal;
            cstPis: string;
            aliqPis: import("@prisma/client/runtime/library").Decimal;
            cstCofins: string;
            aliqCofins: import("@prisma/client/runtime/library").Decimal;
            cstIpi: string | null;
            aliqIpi: import("@prisma/client/runtime/library").Decimal;
        } | null;
    } & {
        id: string;
        categoryId: string;
        grupoTributacaoId: string | null;
        name: string;
        shortCode: string | null;
        barcode: string | null;
        unit: string;
        active: boolean;
        priceCost: import("@prisma/client/runtime/library").Decimal;
        priceSell: import("@prisma/client/runtime/library").Decimal;
        stock: import("@prisma/client/runtime/library").Decimal;
        ncm: string | null;
        cest: string | null;
        origem: number;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    create(tenantId: string, databaseUrl: string, data: ProductCreateDto): Promise<{
        id: string;
        categoryId: string;
        grupoTributacaoId: string | null;
        name: string;
        shortCode: string | null;
        barcode: string | null;
        unit: string;
        active: boolean;
        priceCost: import("@prisma/client/runtime/library").Decimal;
        priceSell: import("@prisma/client/runtime/library").Decimal;
        stock: import("@prisma/client/runtime/library").Decimal;
        ncm: string | null;
        cest: string | null;
        origem: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(tenantId: string, databaseUrl: string, id: string, data: ProductUpdateDto): Promise<{
        id: string;
        categoryId: string;
        grupoTributacaoId: string | null;
        name: string;
        shortCode: string | null;
        barcode: string | null;
        unit: string;
        active: boolean;
        priceCost: import("@prisma/client/runtime/library").Decimal;
        priceSell: import("@prisma/client/runtime/library").Decimal;
        stock: import("@prisma/client/runtime/library").Decimal;
        ncm: string | null;
        cest: string | null;
        origem: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(tenantId: string, databaseUrl: string, id: string): Promise<{
        id: string;
        categoryId: string;
        grupoTributacaoId: string | null;
        name: string;
        shortCode: string | null;
        barcode: string | null;
        unit: string;
        active: boolean;
        priceCost: import("@prisma/client/runtime/library").Decimal;
        priceSell: import("@prisma/client/runtime/library").Decimal;
        stock: import("@prisma/client/runtime/library").Decimal;
        ncm: string | null;
        cest: string | null;
        origem: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    addStock(tenantId: string, databaseUrl: string, productId: string, quantity: number, reason?: string): Promise<{
        product: {
            id: string;
            categoryId: string;
            grupoTributacaoId: string | null;
            name: string;
            shortCode: string | null;
            barcode: string | null;
            unit: string;
            active: boolean;
            priceCost: import("@prisma/client/runtime/library").Decimal;
            priceSell: import("@prisma/client/runtime/library").Decimal;
            stock: import("@prisma/client/runtime/library").Decimal;
            ncm: string | null;
            cest: string | null;
            origem: number;
            createdAt: Date;
            updatedAt: Date;
        };
        quantityAdded: number;
    }>;
    bulkEntry(tenantId: string, databaseUrl: string, items: BulkItem[]): Promise<{
        success: boolean;
        processed: number;
        duplicates: string[];
        hasDuplicates: boolean;
    }>;
    getSettings(tenantId: string, databaseUrl: string): Promise<TenantSettingsDto>;
    saveSettings(tenantId: string, databaseUrl: string, data: TenantSettingsDto): Promise<TenantSettingsDto>;
}
export {};
