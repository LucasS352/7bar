import { ProductsService, TenantSettingsDto } from './products.service';
interface AuthUser {
    tenantId: string;
    databaseUrl: string;
    id: string;
    role: string;
}
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(user: AuthUser): Promise<({
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
    create(user: AuthUser, body: any): Promise<{
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
    bulkEntry(user: AuthUser, items: any[]): Promise<{
        success: boolean;
        processed: number;
        duplicates: string[];
        hasDuplicates: boolean;
    }>;
    addStock(user: AuthUser, id: string, quantity: number, reason?: string): Promise<{
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
    getSettings(user: AuthUser): Promise<TenantSettingsDto>;
    saveSettings(user: AuthUser, body: {
        allowNegativeStock: boolean;
    }): Promise<TenantSettingsDto>;
    update(user: AuthUser, id: string, body: any): Promise<{
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
    remove(user: AuthUser, id: string): Promise<{
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
}
export {};
