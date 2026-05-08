import { NfceService } from './nfce.service';
export declare class NfceController {
    private nfceService;
    constructor(nfceService: NfceService);
    health(): Promise<{
        online: boolean;
        service: string;
    }>;
}
