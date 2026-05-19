import { Response } from 'express';
import { SalesService } from './sales.service';
export declare class SalesController {
    private readonly salesService;
    constructor(salesService: SalesService);
    checkout(body: any): Promise<any>;
    findAll(page?: number, limit?: number): Promise<{
        data: ({
            customer: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                phone: string;
                cpfCnpj: string | null;
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
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    getTodaySales(page?: number, limit?: number): Promise<{
        data: ({
            customer: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                phone: string;
                cpfCnpj: string | null;
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
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    getNfceStatus(id: string): Promise<{
        id: string;
        nfceStatus: string | null;
        nfceNumero: number | null;
        nfceSerie: number | null;
        nfceChave: string | null;
        nfceProtocolo: string | null;
        nfceAutorizadaEm: Date | null;
        nfceQrcode: string | null;
        nfceCodRejeicao: string | null;
        nfceMotivoRejeicao: string | null;
    } | null>;
    emitNfce(id: string): Promise<{
        message: string;
        status: string;
    }>;
    exportXmls(startDate: string, endDate: string, res: Response): Promise<void>;
}
