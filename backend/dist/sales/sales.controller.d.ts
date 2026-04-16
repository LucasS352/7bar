import { SalesService } from './sales.service';
export declare class SalesController {
    private readonly salesService;
    constructor(salesService: SalesService);
    checkout(user: any, body: any): Promise<{
        items: {
            id: string;
            saleId: string;
            productId: string;
            quantity: number;
            priceUnit: number;
            subtotal: number;
        }[];
        payments: {
            id: string;
            saleId: string;
            method: string;
            value: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string | null;
        total: number;
        discount: number;
        status: string;
        customerCpf: string | null;
        customerName: string | null;
        nfeStatus: string | null;
    }>;
    findAll(user: any): Promise<({
        customer: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
            address: string | null;
            reference: string | null;
        } | null;
        items: ({
            product: {
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
            };
        } & {
            id: string;
            saleId: string;
            productId: string;
            quantity: number;
            priceUnit: number;
            subtotal: number;
        })[];
        payments: {
            id: string;
            saleId: string;
            method: string;
            value: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string | null;
        total: number;
        discount: number;
        status: string;
        customerCpf: string | null;
        customerName: string | null;
        nfeStatus: string | null;
    })[]>;
    getTodaySales(user: any): Promise<({
        customer: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
            address: string | null;
            reference: string | null;
        } | null;
        items: ({
            product: {
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
            };
        } & {
            id: string;
            saleId: string;
            productId: string;
            quantity: number;
            priceUnit: number;
            subtotal: number;
        })[];
        payments: {
            id: string;
            saleId: string;
            method: string;
            value: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string | null;
        total: number;
        discount: number;
        status: string;
        customerCpf: string | null;
        customerName: string | null;
        nfeStatus: string | null;
    })[]>;
}
