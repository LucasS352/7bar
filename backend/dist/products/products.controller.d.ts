import { ProductsService, TenantSettingsDto } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
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
            priceCost: import("@prisma/client/runtime/library").Decimal;
            priceSell: import("@prisma/client/runtime/library").Decimal;
            stock: import("@prisma/client/runtime/library").Decimal;
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
    create(body: any): Promise<{
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
        priceCost: import("@prisma/client/runtime/library").Decimal;
        priceSell: import("@prisma/client/runtime/library").Decimal;
        stock: import("@prisma/client/runtime/library").Decimal;
        ncm: string | null;
        cest: string | null;
        origem: number;
    }>;
    bulkEntry(items: any[]): Promise<{
        success: boolean;
        processed: number;
        duplicates: string[];
        hasDuplicates: boolean;
    }>;
    addStock(id: string, quantity: number, reason?: string): Promise<{
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
            priceCost: import("@prisma/client/runtime/library").Decimal;
            priceSell: import("@prisma/client/runtime/library").Decimal;
            stock: import("@prisma/client/runtime/library").Decimal;
            ncm: string | null;
            cest: string | null;
            origem: number;
        };
        quantityAdded: number;
    }>;
    getSettings(): Promise<TenantSettingsDto>;
    saveSettings(body: {
        allowNegativeStock: boolean;
    }): Promise<TenantSettingsDto>;
    update(id: string, body: any): Promise<{
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
        priceCost: import("@prisma/client/runtime/library").Decimal;
        priceSell: import("@prisma/client/runtime/library").Decimal;
        stock: import("@prisma/client/runtime/library").Decimal;
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
        priceCost: import("@prisma/client/runtime/library").Decimal;
        priceSell: import("@prisma/client/runtime/library").Decimal;
        stock: import("@prisma/client/runtime/library").Decimal;
        ncm: string | null;
        cest: string | null;
        origem: number;
    }>;
}
