import { Response } from 'express';
import { HeartPrismaService } from './prisma/heart-prisma.service';
export declare class AppController {
    private readonly heartPrisma;
    constructor(heartPrisma: HeartPrismaService);
    healthCheck(): {
        status: string;
        version: string;
        uptime: number;
        timestamp: string;
    };
    serveProductImage(id: string, res: Response): Promise<void>;
}
