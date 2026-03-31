import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(user: any): Promise<({
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
    create(user: any, body: any): Promise<{
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
    bulkEntry(user: any, items: any[]): Promise<{
        success: boolean;
        processed: number;
    }>;
    update(user: any, id: string, body: any): Promise<{
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
    remove(user: any, id: string): Promise<{
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
}
