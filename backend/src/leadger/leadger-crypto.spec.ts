import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import {
  buildSafeLeadgerPhotoUrl,
  computeRetryDelayMs,
  isValidReferenceMonth,
  isValidYmdDate,
  mapTenantStatusToLeadgerBaseStatus,
  nextBillingDateYmd,
  normalizeDocument,
  normalizeEmail,
  normalizePhoneE164,
  serializeBaseUpsertBatch,
  serializeInvoiceUpsert,
  signLeadgerPayload,
  toCentavos,
} from './leadger-crypto';

describe('leadger-crypto (Contrato v1)', () => {
  it('computes exact HMAC-SHA256 using UTF-8 secret without hex-decoding', () => {
    const secret = 'abcdef0123456789abcdef0123456789';
    const timestamp = '1795000000';
    const source = 'sistema-amigo';
    const payloadJson = '{"schemaVersion":1,"eventId":"evt-1"}';

    const expected = `sha256=${createHmac('sha256', secret)
      .update(`${timestamp}.${source}.`)
      .update(Buffer.from(payloadJson, 'utf8'))
      .digest('hex')}`;

    expect(signLeadgerPayload({ timestamp, source, secret, payloadJson })).toBe(expected);
  });

  it('converts BRL to integer centavos and rejects invalid/overflow values', () => {
    expect(toCentavos(149.9)).toBe(14990);
    expect(toCentavos('19.99')).toBe(1999);
    expect(() => toCentavos(0, false)).toThrow(BadRequestException);
    expect(toCentavos(0, true)).toBe(0);
    expect(() => toCentavos(-1, true)).toThrow(BadRequestException);
    expect(() => toCentavos(30_000_000)).toThrow(BadRequestException);
  });

  it('validates calendar dates, months and preserves billingDay 31 across short months', () => {
    expect(isValidYmdDate('2026-02-28')).toBe(true);
    expect(isValidYmdDate('2026-02-30')).toBe(false);
    expect(isValidReferenceMonth('2026-12')).toBe(true);
    expect(isValidReferenceMonth('2026-13')).toBe(false);

    expect(nextBillingDateYmd('2026-01-31', 31)).toBe('2026-02-28');
    expect(nextBillingDateYmd('2026-02-28', 31)).toBe('2026-03-31');
    expect(nextBillingDateYmd('2026-12-10', 10)).toBe('2027-01-10');
  });

  it('normalizes documents, emails, phones E.164 and tenant statuses cleanly', () => {
    expect(normalizeDocument('12.345.678/0001-99')).toBe('12345678000199');
    expect(normalizeEmail(' FinAnceiro@Adega.COM.BR ')).toBe('financeiro@adega.com.br');
    expect(normalizeEmail('invalido')).toBeNull();
    expect(normalizePhoneE164('(14) 99999-8888')).toBe('+5514999998888');
    expect(mapTenantStatusToLeadgerBaseStatus('active')).toBe('active');
    expect(mapTenantStatusToLeadgerBaseStatus('suspended')).toBe('paused');
    expect(mapTenantStatusToLeadgerBaseStatus('inactive')).toBe('cancelled');
  });

  it('enforces Section 11 HTTPS rules on photo sourceUrl', () => {
    expect(buildSafeLeadgerPhotoUrl('https://pdv.teltech.com.br', 'logo-1.webp')).toBe(
      'https://pdv.teltech.com.br/api/tenants/uploads/logos/logo-1.webp',
    );
    expect(buildSafeLeadgerPhotoUrl('http://pdv.teltech.com.br', 'logo-1.webp')).toBeNull();
    expect(buildSafeLeadgerPhotoUrl('https://localhost:3521', 'logo-1.webp')).toBeNull();
    expect(buildSafeLeadgerPhotoUrl('https://192.168.1.10', 'logo-1.webp')).toBeNull();
    expect(buildSafeLeadgerPhotoUrl('https://pdv.teltech.com.br:8443', 'logo-1.webp')).toBeNull();
    expect(buildSafeLeadgerPhotoUrl('https://user:pass@pdv.teltech.com.br', 'logo-1.webp')).toBeNull();
  });

  it('chunks base.upsert payloads beyond 60 invoices into follow-up invoice.upsert events', () => {
    const invoices = Array.from({ length: 62 }, (_, idx) => ({
      externalId: `fat-${idx + 1}`,
      version: 1,
      description: `Mensalidade ${idx + 1}`,
      amount: 14990,
      dueDate: '2026-10-10',
      referenceMonth: '2026-10',
      status: 'pending' as const,
      paidAt: null,
      paymentMethod: null,
    }));

    const batch = serializeBaseUpsertBatch({
      occurredAt: '2026-10-10T15:00:00Z',
      client: {
        externalId: 'cli-1',
        version: 1,
        name: 'Adega Teste',
        document: '12345678000199',
        email: 'a@b.com',
        phone: '+5514999999999',
        status: 'active',
        notes: null,
      },
      base: {
        externalId: 'base-1',
        version: 1,
        name: 'Adega Teste',
        monthlyAmount: 14990,
        billingDay: 10,
        startDate: '2026-10-01',
        endDate: null,
        effectiveDate: '2026-10-01',
        status: 'active',
      },
      invoices,
    });

    const parsedPrimary = JSON.parse(batch.primaryJson);
    expect(parsedPrimary.data.invoices).toHaveLength(60);
    expect(batch.extraInvoices).toHaveLength(2);
    expect(JSON.parse(batch.extraInvoices[1].json).eventType).toBe('invoice.upsert');
  });

  it('rejects invoice paid without paidAt or amount <= 0 and honors Retry-After', () => {
    expect(() =>
      serializeInvoiceUpsert({
        occurredAt: '2026-10-10T15:00:00Z',
        baseExternalId: 'base-1',
        invoice: {
          externalId: 'fat-1',
          version: 1,
          description: 'Teste',
          amount: 1000,
          dueDate: '2026-10-10',
          referenceMonth: '2026-10',
          status: 'paid',
          paidAt: null,
          paymentMethod: 'pix',
        },
      }),
    ).toThrow(BadRequestException);

    expect(computeRetryDelayMs(0, '45')).toBe(45_000);
    expect(computeRetryDelayMs(1, null, 0.5)).toBe(30_000);
  });
});
