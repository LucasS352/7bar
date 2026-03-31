import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TenantConnectionManager implements OnModuleDestroy {
  private clients = new Map<string, PrismaClient>();

  /**
   * Obtém ou cria uma conexão cacheada para um tenant em específico.
   */
  async getTenantClient(tenantId: string, databaseUrl: string): Promise<PrismaClient> {
    if (this.clients.has(tenantId)) {
      return this.clients.get(tenantId)!;
    }

    // Caso não exista, inicializamos um novo cliente Prisma dinâmico
    const client = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    await client.$connect();
    this.clients.set(tenantId, client);

    return client;
  }

  async onModuleDestroy() {
    const disconnectPromises = Array.from(this.clients.values()).map((client) =>
      client.$disconnect(),
    );
    await Promise.all(disconnectPromises);
    this.clients.clear();
  }
}
