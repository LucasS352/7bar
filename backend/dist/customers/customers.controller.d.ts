import { CustomersService } from './customers.service';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    findAll(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        cpfCnpj: string | null;
        address: string | null;
        reference: string | null;
    }[]>;
    findByPhone(phone: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        cpfCnpj: string | null;
        address: string | null;
        reference: string | null;
    } | null>;
    create(body: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        cpfCnpj: string | null;
        address: string | null;
        reference: string | null;
    }>;
}
