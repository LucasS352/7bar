import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';

const DEMO_TENANT_ID = 'demo-tenant-001';
const DEMO_OPERATOR_ID = 'demo-op-1';
const DEMO_DB_URL = () => process.env.DATABASE_URL_TENANT || 'mysql://root:7bar%402025@mysql:3306/demo_adega';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private readonly heartPrisma: HeartPrismaService,
    private readonly tenantManager: TenantConnectionManager,
  ) {}

  async registerLead(name: string, whatsapp: string) {
    try {
      await this.heartPrisma.tenant.upsert({
        where: { id: DEMO_TENANT_ID },
        update: {},
        create: {
          id: DEMO_TENANT_ID,
          databaseName: 'demo_adega',
          databaseUrl: DEMO_DB_URL(),
          name: 'Adega Modelo',
          nomeFantasia: 'Adega Modelo',
          razaoSocial: 'Adega Modelo Demonstração LTDA',
          status: 'active',
          modulos: { nfce: true, estoque: true, dashboardMobile: true, comandas: true },
        },
      });
    } catch (e: any) {
      this.logger.warn(`Erro ao garantir tenant demo no heart: ${e.message}`);
    }

    return this.heartPrisma.lead.create({
      data: {
        name,
        whatsapp,
        status: 'EM_DEMO',
        source: 'demo',
      },
    });
  }

  /**
   * Garante que exista um operador ativo e um caixa aberto no banco demo.
   * Retorna os dados para o frontend setar automaticamente no localStorage.
   */
  async ensureDemoOperatorAndRegister() {
    try {
      const tenantPrisma = await this.tenantManager.getTenantClient(DEMO_TENANT_ID, DEMO_DB_URL());

      // 1. Buscar operador demo
      let operator = await tenantPrisma.operator.findFirst({
        where: { id: DEMO_OPERATOR_ID },
      });

      if (!operator) {
        // Fallback: buscar qualquer operador ativo
        operator = await tenantPrisma.operator.findFirst({
          where: { active: true },
        });
      }

      if (!operator) {
        this.logger.warn('Nenhum operador encontrado no banco demo');
        return {
          operator: null,
          cashRegister: null,
        };
      }

      // 2. Verificar se já existe um caixa aberto para este operador
      let cashRegister = await tenantPrisma.cashRegister.findFirst({
        where: {
          operatorId: operator.id,
          status: 'open',
        },
      });

      // 3. Se não houver caixa aberto, abrir um automaticamente
      if (!cashRegister) {
        try {
          cashRegister = await tenantPrisma.cashRegister.create({
            data: {
              operatorId: operator.id,
              openingValue: 100.0,
              status: 'open',
            },
          });
          this.logger.log(`Caixa demo aberto automaticamente para operador ${operator.name}`);
        } catch (e: any) {
          this.logger.warn(`Erro ao abrir caixa demo: ${e.message}`);
        }
      }

      return {
        operator: {
          id: operator.id,
          name: operator.name,
          role: (operator as any).jobTitle || 'Caixa',
          isManager: (operator as any).isManager || false,
        },
        cashRegister: cashRegister ? {
          id: cashRegister.id,
          status: cashRegister.status,
        } : null,
      };
    } catch (e: any) {
      this.logger.error(`Erro ao configurar operador/caixa demo: ${e.message}`);
      return { operator: null, cashRegister: null };
    }
  }

  getDemoStatus(jwtPayload: any) {
    return {
      isDemoMode: true,
      message: 'Sessão de demonstração ativa.',
      user: jwtPayload,
    };
  }

  @Cron('0 3 * * *')
  async handleDemoDatabaseReset() {
    if (process.env.APP_MODE === 'demo') {
      this.logger.log('Resetting demo database & recalibrating sales timestamps...');
      try {
        const tenantPrisma = await this.tenantManager.getTenantClient(DEMO_TENANT_ID, DEMO_DB_URL());
        await tenantPrisma.$executeRawUnsafe(
          "UPDATE sales SET createdAt = DATE_SUB(NOW(), INTERVAL (ABS(CAST(CONV(SUBSTRING(id, 1, 4), 16, 10) AS UNSIGNED)) % 14) DAY)"
        );
        this.logger.log('Demo sales timestamps recalibrated to current date!');
      } catch (e: any) {
        this.logger.error(`Error resetting demo database: ${e.message}`);
      }
    }
  }
}
