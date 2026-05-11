import { CashRegistersService } from './cash-registers.service';
export declare class CashRegistersController {
    private readonly cashRegistersService;
    constructor(cashRegistersService: CashRegistersService);
    open(body: {
        openingValue: number;
        operatorId?: string;
    }): Promise<{
        id: string;
        operatorId: string | null;
        status: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: import("@prisma/client/runtime/library").Decimal;
        closingValue: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    findAll(): Promise<{
        id: string;
        operatorId: string | null;
        status: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: import("@prisma/client/runtime/library").Decimal;
        closingValue: import("@prisma/client/runtime/library").Decimal | null;
    }[]>;
    close(id: string, closingValue: number): Promise<{
        id: string;
        operatorId: string | null;
        status: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: import("@prisma/client/runtime/library").Decimal;
        closingValue: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    addMovement(id: string, body: {
        type: 'IN' | 'OUT';
        value: number;
        reason: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        reason: string | null;
        cashRegisterId: string;
        value: import("@prisma/client/runtime/library").Decimal;
    }>;
    getReport(id: string): Promise<{
        register: {
            id: string;
            operatorId: string | null;
            status: string;
            openingTime: Date;
            closingTime: Date | null;
            openingValue: import("@prisma/client/runtime/library").Decimal;
            closingValue: import("@prisma/client/runtime/library").Decimal | null;
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
                } & {
                    id: string;
                    csosn: string | null;
                    cstIcms: string | null;
                    cfop: string | null;
                    aliqIcms: import("@prisma/client/runtime/library").Decimal;
                    cstPis: string;
                    aliqPis: import("@prisma/client/runtime/library").Decimal;
                    cstCofins: string;
                    aliqCofins: import("@prisma/client/runtime/library").Decimal;
                    unit: string;
                    ncm: string | null;
                    cest: string | null;
                    origem: number;
                    saleId: string;
                    productId: string;
                    productName: string;
                    quantity: import("@prisma/client/runtime/library").Decimal;
                    priceUnit: import("@prisma/client/runtime/library").Decimal;
                    discount: import("@prisma/client/runtime/library").Decimal;
                    subtotal: import("@prisma/client/runtime/library").Decimal;
                    valorIcms: import("@prisma/client/runtime/library").Decimal;
                    valorPis: import("@prisma/client/runtime/library").Decimal;
                    valorCofins: import("@prisma/client/runtime/library").Decimal;
                })[];
                payments: {
                    id: string;
                    saleId: string;
                    tPag: string;
                    method: string;
                    value: import("@prisma/client/runtime/library").Decimal;
                    troco: import("@prisma/client/runtime/library").Decimal;
                }[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                discount: import("@prisma/client/runtime/library").Decimal;
                subtotal: import("@prisma/client/runtime/library").Decimal;
                customerId: string | null;
                operatorId: string | null;
                cashRegisterId: string | null;
                total: import("@prisma/client/runtime/library").Decimal;
                status: string;
                emitirNfce: boolean;
                nfceStatus: string | null;
                nfceNumero: number | null;
                nfceSerie: number | null;
                nfceChave: string | null;
                nfceProtocolo: string | null;
                nfceAutorizadaEm: Date | null;
                nfceXml: string | null;
                nfceQrcode: string | null;
                nfceCodRejeicao: string | null;
                nfceMotivoRejeicao: string | null;
                consumidorCpf: string | null;
                consumidorNome: string | null;
            })[];
            movements: {
                id: string;
                createdAt: Date;
                type: string;
                reason: string | null;
                cashRegisterId: string;
                value: import("@prisma/client/runtime/library").Decimal;
            }[];
        };
    }>;
    getCurrent(): Promise<{
        id: string;
        operatorId: string | null;
        status: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: import("@prisma/client/runtime/library").Decimal;
        closingValue: import("@prisma/client/runtime/library").Decimal | null;
    } | null>;
}
