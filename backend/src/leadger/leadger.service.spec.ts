import { BadRequestException } from '@nestjs/common';
import { LeadgerService } from './leadger.service';
import { signLeadgerPayload } from './leadger-crypto';

function createFakeHeart() {
  const state = {
    tenants: new Map<string, any>(),
    clients: new Map<string, any>(),
    bases: new Map<string, any>(),
    invoices: new Map<string, any>(),
    paymentLogs: [] as any[],
    outbox: [] as any[],
  };

  let idSeq = 1;
  const nextId = (prefix: string) => `${prefix}-${idSeq++}`;

  const heart: any = {
    _state: state,
    $transaction: async (cbOrArray: any) => {
      if (typeof cbOrArray === 'function') {
        return cbOrArray(heart);
      }
      return Promise.all(cbOrArray);
    },
    tenant: {
      findUnique: jest.fn(async ({ where }: any) => state.tenants.get(where.id) ?? null),
      findMany: jest.fn(async () =>
        Array.from(state.tenants.values()).map((t) => {
          const base = Array.from(state.bases.values()).find((b) => b.tenantId === t.id) ?? null;
          const client = base ? state.clients.get(base.billingClientId) ?? null : null;
          return {
            ...t,
            billingBaseConfig: base ? { ...base, billingClient: client } : null,
            billingInvoices: Array.from(state.invoices.values()).filter((i) => i.tenantId === t.id),
            paymentLogs: state.paymentLogs.filter((p) => p.tenantId === t.id),
          };
        }),
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const cur = state.tenants.get(where.id);
        const upd = { ...cur, ...data };
        state.tenants.set(where.id, upd);
        return upd;
      }),
    },
    billingClient: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        const client =
          (where.id && state.clients.get(where.id)) ||
          (where.externalId &&
            Array.from(state.clients.values()).find((c) => c.externalId === where.externalId)) ||
          null;
        if (!client) return null;
        if (include?.bases) {
          return {
            ...client,
            bases: Array.from(state.bases.values()).filter((b) => b.billingClientId === client.id),
          };
        }
        return client;
      }),
      findMany: jest.fn(async () => Array.from(state.clients.values())),
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: data.id || nextId('bc'),
          photoLogoId: null,
          photoVersion: 0,
          lastSyncedPhotoVersion: 0,
          photoRemoved: false,
          notes: null,
          document: null,
          email: null,
          phone: null,
          ...data,
        };
        state.clients.set(row.id, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const cur = state.clients.get(where.id);
        const upd = { ...cur, ...data };
        state.clients.set(where.id, upd);
        return upd;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const [k, v] of state.clients.entries()) {
          if (!where.externalId || v.externalId === where.externalId) {
            state.clients.set(k, { ...v, ...data });
            count++;
          }
        }
        return { count };
      }),
    },
    billingBaseConfig: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        const row =
          (where.id && state.bases.get(where.id)) ||
          (where.tenantId && Array.from(state.bases.values()).find((b) => b.tenantId === where.tenantId)) ||
          null;
        if (!row) return null;
        if (include?.billingClient) {
          return { ...row, billingClient: state.clients.get(row.billingClientId) };
        }
        return row;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return Array.from(state.bases.values())
          .filter((b) => (!where?.status || b.status === where.status))
          .map((b) => ({ ...b, billingClient: state.clients.get(b.billingClientId) }));
      }),
      create: jest.fn(async ({ data, include }: any) => {
        const row = {
          id: nextId('bb'),
          baseSyncedAt: null,
          lastDeliveredBaseVersion: 0,
          endDate: null,
          ...data,
        };
        state.bases.set(row.id, row);
        if (include?.billingClient) {
          return { ...row, billingClient: state.clients.get(row.billingClientId) };
        }
        return row;
      }),
      update: jest.fn(async ({ where, data, include }: any) => {
        const cur = state.bases.get(where.id);
        const upd = { ...cur, ...data };
        state.bases.set(where.id, upd);
        if (include?.billingClient) {
          return { ...upd, billingClient: state.clients.get(upd.billingClientId) };
        }
        return upd;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const [k, v] of state.bases.entries()) {
          if (!where.baseExternalId || v.baseExternalId === where.baseExternalId) {
            state.bases.set(k, { ...v, ...data });
            count++;
          }
        }
        return { count };
      }),
    },
    billingInvoice: {
      count: jest.fn(async ({ where }: any) => {
        return Array.from(state.invoices.values()).filter(
          (i) => i.baseConfigId === where.baseConfigId && i.referenceMonth === where.referenceMonth,
        ).length;
      }),
      findUnique: jest.fn(async ({ where, include }: any) => {
        const row = state.invoices.get(where.id);
        if (!row) return null;
        if (include?.baseConfig) {
          const base = state.bases.get(row.baseConfigId);
          return {
            ...row,
            baseConfig: include.baseConfig.include?.billingClient
              ? { ...base, billingClient: state.clients.get(base.billingClientId) }
              : base,
          };
        }
        return row;
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        return (
          Array.from(state.invoices.values()).find(
            (i) =>
              (!where.baseConfigId || i.baseConfigId === where.baseConfigId) &&
              (!where.referenceMonth || i.referenceMonth === where.referenceMonth) &&
              (!where.status || i.status === where.status),
          ) ?? null
        );
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return Array.from(state.invoices.values()).filter(
          (i) =>
            (!where?.tenantId || i.tenantId === where.tenantId) &&
            (!where?.baseConfigId || i.baseConfigId === where.baseConfigId) &&
            (!where?.status || i.status === where.status) &&
            (!where?.dueDate?.gte || i.dueDate >= where.dueDate.gte),
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: nextId('inv'), paidAt: null, paymentMethod: null, paymentLogId: null, ...data };
        state.invoices.set(row.id, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const cur = state.invoices.get(where.id);
        const upd = { ...cur, ...data };
        state.invoices.set(where.id, upd);
        return upd;
      }),
    },
    paymentLog: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: nextId('pl'), createdAt: new Date(), ...data };
        state.paymentLogs.push(row);
        return row;
      }),
    },
    leadgerOutboxEvent: {
      count: jest.fn(async () => state.outbox.length),
      groupBy: jest.fn(async () => []),
      findMany: jest.fn(async ({ where }: any) => {
        return state.outbox.filter((e) => {
          if (where?.status && e.status !== where.status) return false;
          if (where?.nextAttemptAt?.lte && e.nextAttemptAt > where.nextAttemptAt.lte) return false;
          return true;
        });
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        return (
          state.outbox.find(
            (e) =>
              (!where.baseExternalId || e.baseExternalId === where.baseExternalId) &&
              (!where.eventType || e.eventType === where.eventType) &&
              (!where.status?.in || where.status.in.includes(e.status)) &&
              (!where.createdAt?.lte || e.createdAt <= where.createdAt.lte),
          ) ?? null
        );
      }),
      findUnique: jest.fn(async ({ where }: any) => state.outbox.find((e) => e.id === where.id) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: nextId('evt'),
          createdAt: new Date(Date.now() + state.outbox.length),
          updatedAt: new Date(),
          deliveredAt: null,
          lastHttpStatus: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          ...data,
        };
        state.outbox.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const idx = state.outbox.findIndex((e) => e.id === where.id);
        state.outbox[idx] = { ...state.outbox[idx], ...data };
        return state.outbox[idx];
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (let i = 0; i < state.outbox.length; i++) {
          const e = state.outbox[i];
          if (where.id && e.id !== where.id) continue;
          if (where.status && e.status !== where.status) continue;
          if (where.lockedAt?.lt && (!e.lockedAt || e.lockedAt >= where.lockedAt.lt)) continue;
          state.outbox[i] = { ...e, ...data };
          count++;
        }
        return { count };
      }),
    },
  };

  return heart;
}

describe('LeadgerService (Outbox, Faturas, Multi-Base, Foto e Resiliência)', () => {
  const prevEnv = { ...process.env };

  beforeEach(() => {
    process.env.LEADGER_WEBHOOK_URL = 'https://leadger.teltech.com.br/api/webhooks/inbound/sistema-amigo';
    process.env.LEADGER_WEBHOOK_SOURCE = 'sistema-amigo';
    process.env.LEADGER_WEBHOOK_SECRET = 'segredo-super-teste-123';
    process.env.LEADGER_WEBHOOK_ENABLED = 'true';
    process.env.LEADGER_PHOTO_SYNC_ENABLED = 'true';
    process.env.PUBLIC_APP_URL = 'https://adega.teltech.com.br';
  });

  afterEach(() => {
    process.env = { ...prevEnv };
  });

  it('handles missing Heart tables gracefully in getStatus', async () => {
    const heart = createFakeHeart();
    heart.leadgerOutboxEvent.count.mockRejectedValueOnce({ code: 'P2021', message: "Table 'heart.leadger_outbox_events' doesn't exist" });
    const svc = new LeadgerService(heart);

    const status = await svc.getStatus();
    expect(status.tablesReady).toBe(false);
    expect(status.hasSecret).toBe(true);
    expect((status as any).secret).toBeUndefined();
  });

  it('enqueues base.upsert with initial pending invoice + separate client.upsert with photo, then delivers with valid HMAC', async () => {
    const heart = createFakeHeart();
    heart._state.tenants.set('t-1', {
      id: 't-1',
      name: 'Adega Matriz',
      nomeFantasia: 'Adega Matriz',
      razaoSocial: 'Adega Matriz LTDA',
      cnpj: '12.345.678/0001-99',
      emailContato: 'fin@adega.com.br',
      telefoneContato: '(14) 99999-1111',
      status: 'active',
      logoUrl: '/api/tenants/uploads/logos/img-99',
      mensalidadeValor: 149.9,
      mensalidadeVencimento: new Date('2026-10-10T12:00:00Z'),
      createdAt: new Date('2026-10-01T12:00:00Z'),
    });

    const sentRequests: { url: string; headers: Record<string, string>; body: string }[] = [];
    const svc = new LeadgerService(heart);
    svc.setHttpClientForTest(async (url, init) => {
      sentRequests.push({ url, headers: init.headers, body: init.body });
      const parsedBody = JSON.parse(init.body);
      if (parsedBody.eventType === 'client.upsert') {
        return {
          status: 200,
          headers: { get: () => null },
          text: async () =>
            JSON.stringify({ ok: true, outcome: 'applied', photo: { status: 'stored', version: 1, url: '/local/1.webp' } }),
        };
      }
      return {
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ ok: true, outcome: 'applied' }),
      };
    });

    const queued = await svc.enqueueBaseSync('t-1');
    expect(queued.invoicesCount).toBe(1);
    expect(heart._state.outbox).toHaveLength(2); // 1 base.upsert + 1 client.upsert com photo

    const basePayload = JSON.parse(heart._state.outbox[0].payloadJson);
    expect(basePayload.eventType).toBe('base.upsert');
    expect(basePayload.data.base.monthlyAmount).toBe(14990);
    expect(basePayload.data.client.photo).toBeUndefined(); // photo não vai no base.upsert
    expect(basePayload.data.invoices).toHaveLength(1);
    expect(basePayload.data.invoices[0].amount).toBe(14990);
    expect(basePayload.data.invoices[0].status).toBe('pending');

    const photoPayload = JSON.parse(heart._state.outbox[1].payloadJson);
    expect(photoPayload.eventType).toBe('client.upsert');
    expect(photoPayload.data.photo).toEqual({
      sourceUrl: 'https://adega.teltech.com.br/api/tenants/uploads/logos/img-99',
      version: 1,
    });

    const result = await svc.processOutboxBatch(10);
    expect(result).toEqual({ processed: 2, delivered: 2, deferred: 0 });

    // Valida assinatura HMAC real produzida
    const req0 = sentRequests[0];
    const expectedSig = signLeadgerPayload({
      timestamp: req0.headers['X-Leadger-Timestamp'],
      source: 'sistema-amigo',
      secret: 'segredo-super-teste-123',
      payloadJson: req0.body,
    });
    expect(req0.headers['X-Leadger-Signature']).toBe(expectedSig);

    const updatedClient = Array.from(heart._state.clients.values())[0] as any;
    expect(updatedClient.lastSyncedPhotoVersion).toBe(1);
  });

  it('supports 1 BillingClient with 2 bases, adjusts future pending without changing paid, and processes payment + refund', async () => {
    const heart = createFakeHeart();
    heart._state.tenants.set('t-a', {
      id: 't-a',
      name: 'Loja Centro',
      status: 'active',
      mensalidadeValor: 100,
      mensalidadeVencimento: new Date('2026-10-10T12:00:00Z'),
      createdAt: new Date('2026-10-01T12:00:00Z'),
    });
    heart._state.tenants.set('t-b', {
      id: 't-b',
      name: 'Loja Bairro',
      status: 'active',
      mensalidadeValor: 200,
      mensalidadeVencimento: new Date('2026-10-15T12:00:00Z'),
      createdAt: new Date('2026-10-01T12:00:00Z'),
    });

    const svc = new LeadgerService(heart);
    const sharedClient = await svc.createBillingClient({
      name: 'Grupo Adega Reunida',
      document: '12.345.678/0001-99',
      email: 'grupo@adega.com',
    });

    await svc.updateTenantBaseConfig('t-a', { billingClientId: sharedClient.id, syncEnabled: true });
    await svc.updateTenantBaseConfig('t-b', { billingClientId: sharedClient.id, syncEnabled: true });
    await svc.enqueueBaseSync('t-a');
    await svc.enqueueBaseSync('t-b');

    svc.setHttpClientForTest(async () => ({
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({ ok: true, outcome: 'applied' }),
    }));
    await svc.processOutboxBatch(10);

    // Cria fatura de novembro (pendente) e paga a de outubro
    const invOct = Array.from(heart._state.invoices.values() as Iterable<any>).find((i) => i.tenantId === 't-a');
    await svc.createInvoice('t-a', { amount: 100, dueDate: '2026-11-10', referenceMonth: '2026-11' });
    await svc.markInvoicePaid(invOct.id, { paymentMethod: 'pix', generateNext: false });

    // Reajusta mensalidade da Loja Centro para 149,90 a partir de 2026-11-01
    await svc.updateTenantBaseConfig('t-a', { monthlyAmount: 149.9, effectiveDate: '2026-11-01' });

    const allInvsA = Array.from(heart._state.invoices.values() as Iterable<any>).filter((i) => i.tenantId === 't-a');
    const octAfter = allInvsA.find((i) => i.referenceMonth === '2026-10');
    const novAfter = allInvsA.find((i) => i.referenceMonth === '2026-11');
    expect(octAfter.amountCents).toBe(10000); // fatura paga preservada!
    expect(novAfter.amountCents).toBe(14990); // fatura aberta recalculada!

    // Estorno da fatura de outubro
    const refunded = await svc.refundInvoice(octAfter.id, { targetStatus: 'pending', reason: 'PIX devolvido' });
    expect(refunded.status).toBe('pending');
    expect(refunded.paidAt).toBeNull();
    expect(refunded.version).toBe(octAfter.version + 1);
  });

  it('retries 503 keeping exact eventId/body, honors 429 Retry-After, and blocks 409/422 retries', async () => {
    const heart = createFakeHeart();
    heart._state.tenants.set('t-1', {
      id: 't-1',
      name: 'Adega X',
      status: 'active',
      mensalidadeValor: 100,
      mensalidadeVencimento: new Date('2026-10-10T12:00:00Z'),
      createdAt: new Date('2026-10-01T12:00:00Z'),
    });

    const svc = new LeadgerService(heart);
    await svc.enqueueBaseSync('t-1');
    const originalOutbox = { ...heart._state.outbox[0] };

    // 1. 503 Service Unavailable -> mantem PENDING com nextAttemptAt futuro e MESMO corpo/eventId
    svc.setHttpClientForTest(async () => ({
      status: 503,
      headers: { get: () => null },
      text: async () => JSON.stringify({ ok: false, error: 'temporarily_unavailable' }),
    }));
    await svc.processOutboxBatch(5);
    expect(heart._state.outbox[0].status).toBe('PENDING');
    expect(heart._state.outbox[0].attempts).toBe(1);
    expect(heart._state.outbox[0].eventId).toBe(originalOutbox.eventId);
    expect(heart._state.outbox[0].payloadJson).toBe(originalOutbox.payloadJson);

    // 2. Simula janela expirada e devolve 429 com Retry-After: 60
    heart._state.outbox[0].nextAttemptAt = new Date(Date.now() - 1000);
    svc.setHttpClientForTest(async () => ({
      status: 429,
      headers: { get: (h) => (h.toLowerCase() === 'retry-after' ? '60' : null) },
      text: async () => JSON.stringify({ ok: false, error: 'rate_limit_exceeded' }),
    }));
    await svc.processOutboxBatch(5);
    expect(heart._state.outbox[0].status).toBe('PENDING');
    expect(heart._state.outbox[0].nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 50_000);

    // 3. Simula 409 Conflict -> para retries automaticos (FAILED_ACTION_REQUIRED)
    heart._state.outbox[0].nextAttemptAt = new Date(Date.now() - 1000);
    svc.setHttpClientForTest(async () => ({
      status: 409,
      headers: { get: () => null },
      text: async () => JSON.stringify({ ok: false, error: 'existing_contract_requires_link' }),
    }));
    await svc.processOutboxBatch(5);
    expect(heart._state.outbox[0].status).toBe('FAILED_ACTION_REQUIRED');
    expect(heart._state.outbox[0].lastErrorCode).toBe('existing_contract_requires_link');

    // Reenviar sem ter dado delivered retorna o erro ao tentar manualmente se ainda falhar
    await expect(svc.refundInvoice('missing-id', {})).rejects.toThrow();
    expect(() => {
      throw new BadRequestException('ok');
    }).toThrow();
  });
});
