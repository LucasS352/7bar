import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
export declare class AuthService {
    private heartPrisma;
    private jwtService;
    private tenantManager;
    constructor(heartPrisma: HeartPrismaService, jwtService: JwtService, tenantManager: TenantConnectionManager);
    validateUser(email: string, pass: string): Promise<any>;
    validateOperatorPin(tenantId: string, databaseUrl: string, operatorId: string, pin: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            role: any;
            tenant: any;
        };
    }>;
}
