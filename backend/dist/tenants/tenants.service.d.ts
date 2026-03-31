import { HeartPrismaService } from '../prisma/heart-prisma.service';
export declare class TenantsService {
    private heartPrisma;
    constructor(heartPrisma: HeartPrismaService);
    findAll(): import("@prisma/client-heart/client").Prisma.PrismaPromise<({
        users: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            password: string;
            tenantId: string;
            role: string;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        database_name: string;
        database_url: string;
        documentId: string | null;
        stateRegistration: string | null;
        taxRegime: string | null;
        certificatePath: string | null;
    })[]>;
    create(data: any): import("@prisma/client-heart/client").Prisma.Prisma__TenantClient<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        database_name: string;
        database_url: string;
        documentId: string | null;
        stateRegistration: string | null;
        taxRegime: string | null;
        certificatePath: string | null;
    }, never, import("@prisma/client-heart/runtime/library").DefaultArgs, import("@prisma/client-heart/client").Prisma.PrismaClientOptions>;
}
