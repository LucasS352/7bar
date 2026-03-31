import { CustomersService } from './customers.service';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    findAll(user: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        address: string | null;
        reference: string | null;
    }[]>;
    findByPhone(user: any, phone: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        address: string | null;
        reference: string | null;
    } | null>;
    create(user: any, body: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        address: string | null;
        reference: string | null;
    }>;
}
