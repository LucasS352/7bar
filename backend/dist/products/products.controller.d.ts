import { ProductsService, TenantSettingsDto } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(page?: number, limit?: number): Promise<any>;
    lookupBarcode(barcode: string): Promise<{
        source: string;
        data: {
            id: string;
            createdAt: Date;
            name: string;
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
            isComposite: boolean;
            volumeUnit: string | null;
            volumeCapacity: import("@prisma/client/runtime/library").Decimal | null;
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
    create(body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
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
        isComposite: boolean;
        volumeUnit: string | null;
        volumeCapacity: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    uploadPhoto(file: Express.Multer.File, req: any): Promise<{
        imageUrl: string;
    }>;
    bulkEntry(items: any[]): Promise<{
        success: boolean;
        processed: number;
        duplicates: string[];
        hasDuplicates: boolean;
    }>;
    addStock(id: string, quantity: number, costPrice?: number, reason?: string): Promise<{
        product: {
            id: string;
            createdAt: Date;
            name: string;
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
            isComposite: boolean;
            volumeUnit: string | null;
            volumeCapacity: import("@prisma/client/runtime/library").Decimal | null;
        };
        quantityAdded: number;
    }>;
    getSettings(): Promise<TenantSettingsDto>;
    saveSettings(body: {
        allowNegativeStock: boolean;
    }): Promise<TenantSettingsDto>;
    getComposition(id: string): Promise<({
        options: ({
            componentProduct: {
                id: string;
                createdAt: Date;
                name: string;
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
                isComposite: boolean;
                volumeUnit: string | null;
                volumeCapacity: import("@prisma/client/runtime/library").Decimal | null;
            };
        } & {
            id: string;
            name: string;
            quantity: import("@prisma/client/runtime/library").Decimal;
            groupId: string;
            componentProductId: string;
            priceAdjustment: import("@prisma/client/runtime/library").Decimal;
        })[];
    } & {
        id: string;
        name: string;
        productId: string;
        minSelected: number;
        maxSelected: number;
    })[]>;
    update(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
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
        isComposite: boolean;
        volumeUnit: string | null;
        volumeCapacity: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    getProductLots(id: string): Promise<{
        id: string;
        costPrice: number;
        quantity: number;
        remaining: number;
        createdAt: Date;
    }[]>;
    remove(id: string): Promise<any>;
    inventoryExport(categoryIds?: string, productIds?: string): Promise<{
        id: any;
        shortCode: any;
        name: any;
        category: any;
        unit: any;
        stock: number;
    }[]>;
    inventoryImport(items: {
        productId: string;
        newStock: number;
    }[]): Promise<{
        updated: number;
        errors: {
            productId: string;
            error: string;
        }[];
        results: {
            productId: string;
            name: string;
            before: number;
            after: number;
        }[];
    }>;
    inventoryHistory(): Promise<{
        sessionId: string;
        date: string;
        totalProducts: number;
        increases: number;
        decreases: number;
        unchanged: number;
        items: {
            name: string;
            before: number;
            after: number;
            diff: number;
        }[];
    }[]>;
}
