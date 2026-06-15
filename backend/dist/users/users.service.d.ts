import { HeartPrismaService } from '../prisma/heart-prisma.service';
export declare class UsersService {
    private heartPrisma;
    constructor(heartPrisma: HeartPrismaService);
    findAll(tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        active: boolean;
        email: string;
        role: string;
    }[]>;
    create(tenantId: string, data: any): Promise<{
        id: string;
        name: string;
        active: boolean;
        email: string;
        role: string;
    }>;
    toggleStatus(tenantId: string, id: string): Promise<{
        id: string;
        active: boolean;
    }>;
    update(tenantId: string, id: string, data: any): Promise<{
        id: string;
        name: string;
        active: boolean;
        email: string;
        role: string;
    }>;
}
