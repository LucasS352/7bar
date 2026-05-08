import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/** Microsserviço PHP de emissão */

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

@Injectable()
export class NfceService {
  private readonly logger = new Logger(NfceService.name);

  constructor(private httpService: HttpService) {}

  /**
   * Monta o payload e chama o microsserviço PHP para emissão.
   * Se o ambiente for PRODUÇÃO (1), lança erro — não emitimos em produção sem certificado de homologação válido.
   */
  async emitir(payload: {
    empresa: any;
    nota: any;
    certPfxBase64: string;
    certSenha: string;
    ambiente: number;
  }): Promise<NfceResultado> {
    const serviceUrl = process.env.NFCE_SERVICE_URL || 'http://nfce-service:8080';

    // Proteção: bloquear emissão em produção enquanto em desenvolvimento
    if (payload.ambiente === 1) {
      this.logger.warn('Tentativa de emissão em PRODUÇÃO bloqueada — use ambiente 2 (Homologação) para testes.');
      throw new BadGatewayException('Emissão em produção não habilitada neste ambiente. Configure nfceAmbiente=2.');
    }

    this.logger.log(`Enviando NFC-e ao microsserviço PHP: ${serviceUrl}/emitir`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<NfceResultado>(`${serviceUrl}/emitir`, payload, {
          timeout: 30_000, // SEFAZ pode demorar até 30s
        }),
      );
      this.logger.log(`NFC-e resultado: ${data.status} | chave: ${data.chave ?? 'N/A'}`);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.motivoRejeicao || err?.response?.data?.message || err.message || 'Erro de comunicação com serviço NFC-e';
      this.logger.error(`Falha ao emitir NFC-e: ${msg}`);
      return {
        status: 'erro',
        motivoRejeicao: msg,
      };
    }
  }

  /** Health check do microsserviço PHP */
  async healthCheck(): Promise<boolean> {
    const serviceUrl = process.env.NFCE_SERVICE_URL || 'http://nfce-service:8080';
    try {
      await firstValueFrom(this.httpService.get(`${serviceUrl}/status`, { timeout: 5_000 }));
      return true;
    } catch {
      return false;
    }
  }
}

