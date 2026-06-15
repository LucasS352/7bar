import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(user: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        active: boolean;
        email: string;
        role: string;
    }[]>;
    create(user: any, body: any): Promise<{
        id: string;
        name: string;
        active: boolean;
        email: string;
        role: string;
    }>;
    update(user: any, id: string, body: any): Promise<{
        id: string;
        name: string;
        active: boolean;
        email: string;
        role: string;
    }>;
    toggleStatus(user: any, id: string): Promise<{
        id: string;
        active: boolean;
    }>;
}
