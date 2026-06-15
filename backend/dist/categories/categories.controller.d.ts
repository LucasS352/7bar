import { CategoriesService } from './categories.service';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(): Promise<({
        grupoTributacao: {
            id: string;
            createdAt: Date;
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
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        grupoTributacaoId: string | null;
    })[]>;
    create(body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        grupoTributacaoId: string | null;
    }>;
    update(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        grupoTributacaoId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        grupoTributacaoId: string | null;
    }>;
}
