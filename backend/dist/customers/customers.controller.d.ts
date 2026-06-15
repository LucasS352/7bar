import { CustomersService } from './customers.service';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        phone: string;
        cpfCnpj: string | null;
        address: string | null;
        reference: string | null;
    }[]>;
    findByPhone(phone: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        phone: string;
        cpfCnpj: string | null;
        address: string | null;
        reference: string | null;
    } | null>;
    create(body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        phone: string;
        cpfCnpj: string | null;
        address: string | null;
        reference: string | null;
    }>;
}
