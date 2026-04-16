import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private heartPrisma;
    private jwtService;
    constructor(heartPrisma: HeartPrismaService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            role: any;
            tenant: any;
        };
    }>;
    switchByPin(pin: string, tenantId: string): Promise<any>;
    setPin(userId: string, pin: string): Promise<void>;
}
