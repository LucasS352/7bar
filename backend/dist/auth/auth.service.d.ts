import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
export declare class AuthService {
    private heartPrisma;
    private jwtService;
    private tenantManager;
    private tenantContext;
    constructor(heartPrisma: HeartPrismaService, jwtService: JwtService, tenantManager: TenantConnectionManager, tenantContext: TenantContextService);
    validateUser(email: string, pass: string): Promise<any>;
    validateOperatorPin(tenantId: string, operatorId: string, pin: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            role: any;
            tenant: any;
            termsAccepted: boolean;
        };
    }>;
    acceptTerms(tenantId: string): Promise<{
        success: boolean;
    }>;
}
