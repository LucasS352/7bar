import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { Prisma } from '@prisma/client';
interface ModifierOptionInputDto {
    name: string;
    componentProductId: string;
    quantity: number;
    priceAdjustment?: number;
}
interface ModifierGroupInputDto {
    name: string;
    minSelected?: number;
    maxSelected?: number;
    options: ModifierOptionInputDto[];
}
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
    isComposite?: boolean;
    volumeUnit?: string | null;
    volumeCapacity?: number | null;
    modifierGroups?: ModifierGroupInputDto[];
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
    isComposite?: boolean;
    volumeUnit?: string | null;
    volumeCapacity?: number | null;
    modifierGroups?: ModifierGroupInputDto[];
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
    isComposite?: boolean;
    volumeUnit?: string | null;
    volumeCapacity?: number | null;
}
export interface TenantSettingsDto {
    allowNegativeStock: boolean;
}
import { HeartPrismaService } from '../prisma/heart-prisma.service';
export declare class ProductsService {
    private tenantManager;
    private tenantContext;
    private heartPrisma;
    private catalogCache;
    private readonly CACHE_TTL;
    private invalidateCache;
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
            priceCost: Prisma.Decimal;
            priceSell: Prisma.Decimal;
            stock: Prisma.Decimal;
            salesCount: number;
            ncm: string | null;
            cest: string | null;
            origem: number;
            isComposite: boolean;
            volumeUnit: string | null;
            volumeCapacity: Prisma.Decimal | null;
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
    findAll(page?: number, limit?: number): Promise<any>;
    getComposition(id: string): Promise<({
        options: ({
            componentProduct: {
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
                priceCost: Prisma.Decimal;
                priceSell: Prisma.Decimal;
                stock: Prisma.Decimal;
                salesCount: number;
                ncm: string | null;
                cest: string | null;
                origem: number;
                isComposite: boolean;
                volumeUnit: string | null;
                volumeCapacity: Prisma.Decimal | null;
            };
        } & {
            name: string;
            id: string;
            quantity: Prisma.Decimal;
            groupId: string;
            componentProductId: string;
            priceAdjustment: Prisma.Decimal;
        })[];
    } & {
        name: string;
        id: string;
        productId: string;
        minSelected: number;
        maxSelected: number;
    })[]>;
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
        priceCost: Prisma.Decimal;
        priceSell: Prisma.Decimal;
        stock: Prisma.Decimal;
        salesCount: number;
        ncm: string | null;
        cest: string | null;
        origem: number;
        isComposite: boolean;
        volumeUnit: string | null;
        volumeCapacity: Prisma.Decimal | null;
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
        priceCost: Prisma.Decimal;
        priceSell: Prisma.Decimal;
        stock: Prisma.Decimal;
        salesCount: number;
        ncm: string | null;
        cest: string | null;
        origem: number;
        isComposite: boolean;
        volumeUnit: string | null;
        volumeCapacity: Prisma.Decimal | null;
    }>;
    remove(id: string): Promise<any>;
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
            priceCost: Prisma.Decimal;
            priceSell: Prisma.Decimal;
            stock: Prisma.Decimal;
            salesCount: number;
            ncm: string | null;
            cest: string | null;
            origem: number;
            isComposite: boolean;
            volumeUnit: string | null;
            volumeCapacity: Prisma.Decimal | null;
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
    uploadPhoto(tenantId: string, file: Express.Multer.File): Promise<{
        imageUrl: string;
    }>;
}
export {};
