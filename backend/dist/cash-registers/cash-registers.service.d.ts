import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { Prisma } from '@prisma/client';
export declare class CashRegistersService {
    private tenantManager;
    private tenantContext;
    constructor(tenantManager: TenantConnectionManager, tenantContext: TenantContextService);
    private getPrisma;
    openRegister(openingValue: number, operatorId?: string): Promise<{
        id: string;
        operatorId: string | null;
        status: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: Prisma.Decimal;
        closingValue: Prisma.Decimal | null;
    }>;
    closeRegister(id: string, closingValue: number): Promise<{
        id: string;
        operatorId: string | null;
        status: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: Prisma.Decimal;
        closingValue: Prisma.Decimal | null;
    }>;
    getCurrentRegister(): Promise<{
        id: string;
        operatorId: string | null;
        status: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: Prisma.Decimal;
        closingValue: Prisma.Decimal | null;
    } | null>;
    addMovement(registerId: string, type: 'IN' | 'OUT', value: number, reason?: string): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        reason: string | null;
        cashRegisterId: string;
        value: Prisma.Decimal;
    }>;
    findAll(): Promise<{
        id: string;
        operatorId: string | null;
        status: string;
        openingTime: Date;
        closingTime: Date | null;
        openingValue: Prisma.Decimal;
        closingValue: Prisma.Decimal | null;
    }[]>;
    getReport(id: string): Promise<{
        register: {
            id: string;
            operatorId: string | null;
            status: string;
            openingTime: Date;
            closingTime: Date | null;
            openingValue: Prisma.Decimal;
            closingValue: Prisma.Decimal | null;
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
                    id: string;
                    csosn: string | null;
                    cstIcms: string | null;
                    cfop: string | null;
                    aliqIcms: Prisma.Decimal;
                    cstPis: string;
                    aliqPis: Prisma.Decimal;
                    cstCofins: string;
                    aliqCofins: Prisma.Decimal;
                    unit: string;
                    priceCost: Prisma.Decimal;
                    ncm: string | null;
                    cest: string | null;
                    origem: number;
                    saleId: string;
                    productId: string;
                    productName: string;
                    quantity: Prisma.Decimal;
                    priceUnit: Prisma.Decimal;
                    discount: Prisma.Decimal;
                    subtotal: Prisma.Decimal;
                    valorIcms: Prisma.Decimal;
                    valorPis: Prisma.Decimal;
                    valorCofins: Prisma.Decimal;
                })[];
                payments: {
                    id: string;
                    saleId: string;
                    tPag: string;
                    method: string;
                    value: Prisma.Decimal;
                    troco: Prisma.Decimal;
                }[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                discount: Prisma.Decimal;
                subtotal: Prisma.Decimal;
                customerId: string | null;
                operatorId: string | null;
                cashRegisterId: string | null;
                total: Prisma.Decimal;
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
                cancelReason: string | null;
                cancelledAt: Date | null;
            })[];
            movements: {
                id: string;
                createdAt: Date;
                type: string;
                reason: string | null;
                cashRegisterId: string;
                value: Prisma.Decimal;
            }[];
        };
    }>;
}
