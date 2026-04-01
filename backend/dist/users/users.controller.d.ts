import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(user: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        active: boolean;
        email: string;
        role: string;
    }[]>;
    create(user: any, body: any): Promise<{
        name: string;
        id: string;
        active: boolean;
        email: string;
        role: string;
    }>;
    toggleStatus(user: any, id: string): Promise<{
        id: string;
        active: boolean;
    }>;
}
