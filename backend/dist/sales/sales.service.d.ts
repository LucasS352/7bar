import { StreamableFile } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { NfceService } from '../nfce/nfce.service';
import { Prisma } from '@prisma/client';
export declare class SalesService {
    private tenantManager;
    private heartPrisma;
    private nfceService;
    private tenantContext;
    private readonly logger;
    constructor(tenantManager: TenantConnectionManager, heartPrisma: HeartPrismaService, nfceService: NfceService, tenantContext: TenantContextService);
    private getPrisma;
    checkout(data: any): Promise<any>;
    dispararNfce(tenantId: string, databaseUrl: string, sale: any): Promise<void>;
    private atualizarStatusNfce;
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
                    priceCost: Prisma.Decimal;
                    priceSell: Prisma.Decimal;
                    stock: Prisma.Decimal;
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
                aliqIcms: Prisma.Decimal;
                cstPis: string;
                aliqPis: Prisma.Decimal;
                cstCofins: string;
                aliqCofins: Prisma.Decimal;
                unit: string;
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
                    priceCost: Prisma.Decimal;
                    priceSell: Prisma.Decimal;
                    stock: Prisma.Decimal;
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
                aliqIcms: Prisma.Decimal;
                cstPis: string;
                aliqPis: Prisma.Decimal;
                cstCofins: string;
                aliqCofins: Prisma.Decimal;
                unit: string;
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
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    getNfceStatus(saleId: string): Promise<{
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
    emitNfce(saleId: string): Promise<{
        message: string;
        status: string;
    }>;
    exportNfceXmls(startDate: string, endDate: string): Promise<StreamableFile>;
}
