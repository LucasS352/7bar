import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            role: any;
            tenant: any;
        };
    }>;
    operatorLogin(user: any, body: {
        operatorId: string;
        pin: string;
    }): Promise<any>;
}
