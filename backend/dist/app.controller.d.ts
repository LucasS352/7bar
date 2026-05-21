import { Response } from 'express';
export declare class AppController {
    healthCheck(): {
        status: string;
        version: string;
        uptime: number;
        timestamp: string;
    };
    serveProductImage(filename: string, res: Response): void;
}
