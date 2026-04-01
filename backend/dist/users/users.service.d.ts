import { HeartPrismaService } from '../prisma/heart-prisma.service';
export declare class UsersService {
    private heartPrisma;
    constructor(heartPrisma: HeartPrismaService);
    findAll(tenantId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        active: boolean;
        email: string;
        role: string;
    }[]>;
    create(tenantId: string, data: any): Promise<{
        name: string;
        id: string;
        active: boolean;
        email: string;
        role: string;
    }>;
    toggleStatus(tenantId: string, id: string): Promise<{
        id: string;
        active: boolean;
    }>;
}
