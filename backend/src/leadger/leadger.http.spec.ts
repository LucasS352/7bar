import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { LeadgerController } from './leadger.controller';
import { LeadgerService } from './leadger.service';

describe('LeadgerController (HTTP & Segurança x-setup-pin)', () => {
  let app: INestApplication;
  const prevPin = process.env.SETUP_PIN;
  const prevSecret = process.env.LEADGER_WEBHOOK_SECRET;

  const serviceMock = {
    getStatus: jest.fn(async () => ({
      tablesReady: true,
      webhookEnabled: false,
      photoSyncEnabled: false,
      configured: true,
      hasUrl: true,
      hasSource: true,
      hasSecret: true,
      urlHost: 'leadger.teltech.com.br',
      source: 'sistema-amigo',
      photoPublicHost: null,
      photoHostValid: false,
    })),
    listOutbox: jest.fn(async () => ({ counts: { PENDING: 0 }, items: [] })),
    exportReconciliation: jest.fn(async () => []),
  };

  beforeAll(async () => {
    process.env.SETUP_PIN = 'pin-leadger-test';
    process.env.LEADGER_WEBHOOK_SECRET = 'super-segredo-privado-nao-vazar';

    const moduleRef = await Test.createTestingModule({
      controllers: [LeadgerController],
      providers: [{ provide: LeadgerService, useValue: serviceMock }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (prevPin === undefined) delete process.env.SETUP_PIN;
    else process.env.SETUP_PIN = prevPin;
    if (prevSecret === undefined) delete process.env.LEADGER_WEBHOOK_SECRET;
    else process.env.LEADGER_WEBHOOK_SECRET = prevSecret;
  });

  it('rejeita chamadas sem x-setup-pin válido com 401', async () => {
    await request(app.getHttpServer()).get('/api/tenants/setup/leadger/status').expect(401);
    await request(app.getHttpServer())
      .get('/api/tenants/setup/leadger/outbox')
      .set('x-setup-pin', 'errado')
      .expect(401);
  });

  it('retorna status com PIN válido sem expor segredo e com Cache-Control: no-store', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/tenants/setup/leadger/status')
      .set('x-setup-pin', 'pin-leadger-test')
      .expect(200);

    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.body.hasSecret).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('super-segredo-privado-nao-vazar');
  });
});
