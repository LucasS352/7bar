import { TenantsService } from './tenants.service';
import { ProvisionTenantDto } from './provision-tenant.dto';
export declare class TenantsController {
    private readonly tenantsService;
    constructor(tenantsService: TenantsService);
    findAll(user: any): import("@prisma/client-heart/client").Prisma.PrismaPromise<({
        users: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            active: boolean;
            email: string;
            password: string;
            pin: string | null;
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
    create(user: any, body: any): import("@prisma/client-heart/client").Prisma.Prisma__TenantClient<{
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
    setup(body: ProvisionTenantDto): Promise<{
        message: string;
        tenant: {
            id: string;
            name: string;
            database_name: string;
            admin: {
                name: string;
                email: string;
                role: string;
            };
        };
    }>;
    validatePin(body: {
        pin: string;
    }): Promise<{
        valid: boolean;
    }>;
}
