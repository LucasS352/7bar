import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
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
    imageUrl?: string | null;
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
    imageUrl?: string | null;
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
    imageUrl?: string | null;
}
export interface TenantSettingsDto {
    allowNegativeStock: boolean;
}
import { HeartPrismaService } from '../prisma/heart-prisma.service';
export declare class ProductsService {
    private tenantManager;
    private tenantContext;
    private heartPrisma;
    constructor(tenantManager: TenantConnectionManager, tenantContext: TenantContextService, heartPrisma: HeartPrismaService);
    private getPrisma;
    private nextShortCode;
    private sanitize;
    lookupBarcode(barcode: string): Promise<{
        source: string;
        data: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            grupoTributacaoId: string | null;
            shortCode: string | null;
            barcode: string | null;
            unit: string;
            active: boolean;
            imageUrl: string | null;
            priceCost: import("@prisma/client/runtime/library").Decimal;
            priceSell: import("@prisma/client/runtime/library").Decimal;
            stock: import("@prisma/client/runtime/library").Decimal;
            salesCount: number;
            ncm: string | null;
            cest: string | null;
            origem: number;
        };
    } | {
        source: string;
        data: {
            name: string;
            barcode: string;
            ncm: string | null;
            cest: string | null;
            unit: string;
            imageUrl: string | null;
            brand: string | null;
            masterCategory: string | null;
        };
    }>;
    findAll(page?: number, limit?: number): Promise<{
        data: ({
            grupoTributacao: {
                id: string;
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
                createdAt: Date;
                updatedAt: Date;
            } | null;
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
            grupoTributacaoId: string | null;
            shortCode: string | null;
            barcode: string | null;
            unit: string;
            active: boolean;
            imageUrl: string | null;
            priceCost: import("@prisma/client/runtime/library").Decimal;
            priceSell: import("@prisma/client/runtime/library").Decimal;
            stock: import("@prisma/client/runtime/library").Decimal;
            salesCount: number;
            ncm: string | null;
            cest: string | null;
            origem: number;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    create(data: ProductCreateDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        grupoTributacaoId: string | null;
        shortCode: string | null;
        barcode: string | null;
        unit: string;
        active: boolean;
        imageUrl: string | null;
        priceCost: import("@prisma/client/runtime/library").Decimal;
        priceSell: import("@prisma/client/runtime/library").Decimal;
        stock: import("@prisma/client/runtime/library").Decimal;
        salesCount: number;
        ncm: string | null;
        cest: string | null;
        origem: number;
    }>;
    update(id: string, data: ProductUpdateDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        grupoTributacaoId: string | null;
        shortCode: string | null;
        barcode: string | null;
        unit: string;
        active: boolean;
        imageUrl: string | null;
        priceCost: import("@prisma/client/runtime/library").Decimal;
        priceSell: import("@prisma/client/runtime/library").Decimal;
        stock: import("@prisma/client/runtime/library").Decimal;
        salesCount: number;
        ncm: string | null;
        cest: string | null;
        origem: number;
    }>;
    remove(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        grupoTributacaoId: string | null;
        shortCode: string | null;
        barcode: string | null;
        unit: string;
        active: boolean;
        imageUrl: string | null;
        priceCost: import("@prisma/client/runtime/library").Decimal;
        priceSell: import("@prisma/client/runtime/library").Decimal;
        stock: import("@prisma/client/runtime/library").Decimal;
        salesCount: number;
        ncm: string | null;
        cest: string | null;
        origem: number;
    }>;
    addStock(productId: string, quantity: number, reason?: string): Promise<{
        product: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            grupoTributacaoId: string | null;
            shortCode: string | null;
            barcode: string | null;
            unit: string;
            active: boolean;
            imageUrl: string | null;
            priceCost: import("@prisma/client/runtime/library").Decimal;
            priceSell: import("@prisma/client/runtime/library").Decimal;
            stock: import("@prisma/client/runtime/library").Decimal;
            salesCount: number;
            ncm: string | null;
            cest: string | null;
            origem: number;
        };
        quantityAdded: number;
    }>;
    bulkEntry(items: BulkItem[]): Promise<{
        success: boolean;
        processed: number;
        duplicates: string[];
        hasDuplicates: boolean;
    }>;
    getSettings(): Promise<TenantSettingsDto>;
    saveSettings(data: TenantSettingsDto): Promise<TenantSettingsDto>;
}
export {};
