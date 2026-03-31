import { CashRegistersService } from './cash-registers.service';
export declare class CashRegistersController {
    private readonly cashRegistersService;
    constructor(cashRegistersService: CashRegistersService);
    open(user: any, openingValue: number): Promise<{
        id: string;
        status: string;
        userId: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: number;
        closingValue: number | null;
    }>;
    findAll(user: any): Promise<{
        id: string;
        status: string;
        userId: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: number;
        closingValue: number | null;
    }[]>;
    close(user: any, id: string, closingValue: number): Promise<{
        id: string;
        status: string;
        userId: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: number;
        closingValue: number | null;
    }>;
    addMovement(user: any, id: string, body: {
        type: 'IN' | 'OUT';
        value: number;
        reason: string;
    }): Promise<any>;
    getReport(user: any, id: string): Promise<{
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
    getCurrent(user: any): Promise<{
        id: string;
        status: string;
        userId: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: number;
        closingValue: number | null;
    } | null>;
}
