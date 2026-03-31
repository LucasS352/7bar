import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
export declare class CashRegistersService {
    private tenantManager;
    constructor(tenantManager: TenantConnectionManager);
    openRegister(tenantId: string, databaseUrl: string, userId: string, openingValue: number): Promise<{
        id: string;
        status: string;
        userId: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: number;
        closingValue: number | null;
    }>;
    closeRegister(tenantId: string, databaseUrl: string, id: string, closingValue: number): Promise<{
        id: string;
        status: string;
        userId: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: number;
        closingValue: number | null;
    }>;
    getCurrentRegister(tenantId: string, databaseUrl: string, userId: string): Promise<{
        id: string;
        status: string;
        userId: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: number;
        closingValue: number | null;
    } | null>;
    addMovement(tenantId: string, databaseUrl: string, registerId: string, type: 'IN' | 'OUT', value: number, reason?: string): Promise<any>;
    findAll(tenantId: string, databaseUrl: string): Promise<{
        id: string;
        status: string;
        userId: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: number;
        closingValue: number | null;
    }[]>;
    getReport(tenantId: string, databaseUrl: string, id: string): Promise<{
        register: {
            id: string;
            status: string;
            userId: string;
            openingTime: Date;
            closingTime: Date | null;
            openingValue: number;
            closingValue: number | null;
        };
        report: {
            totalDinheiro: number;
            totalPix: number;
            totalCredito: number;
            totalDebito: number;
            totalCartao: number;
            totalVendas: number;
            totalSuprimentos: number;
            totalSangrias: number;
            countSales: number;
            expectedDinheiro: number;
            salesDetails: ({
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
            })[];
            movements: any;
        };
    }>;
}
