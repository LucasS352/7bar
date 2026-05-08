import { HttpService } from '@nestjs/axios';
export interface NfceResultado {
    status: 'autorizada' | 'rejeitada' | 'erro';
    chave?: string;
    protocolo?: string;
    numero?: number;
    xml?: string;
    qrcode?: string;
    codRejeicao?: string;
    motivoRejeicao?: string;
}
export declare class NfceService {
    private httpService;
    private readonly logger;
    constructor(httpService: HttpService);
    emitir(payload: {
        empresa: any;
        nota: any;
        certPfxBase64: string;
        certSenha: string;
        ambiente: number;
    }): Promise<NfceResultado>;
    healthCheck(): Promise<boolean>;
}
