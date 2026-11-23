// node --test tests/checkout-performance.test.cjs — valida gzip API, cache de metadados no PaymentModal e patch local pós-venda.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.join(__dirname, '..');
const readFrontend = (rel) => fs.readFileSync(path.join(frontendRoot, rel), 'utf8');

test('nginx.conf habilita compressão gzip para JSON da API e assets estáticos', () => {
  const nginx = readFrontend('nginx.conf');
  assert.match(nginx, /gzip\s+on;/);
  assert.match(nginx, /application\/json/);
});

test('PosPage e db.ts atualizam apenas os itens vendidos em vez de reescrever 2000 produtos a cada venda', () => {
  const dbTs = readFrontend('src/lib/db.ts');
  assert.match(dbTs, /export async function patchCachedProductsStock/);
  assert.match(dbTs, /bulkGet\(ids\)/);

  const posPage = readFrontend('src/pages/PosPage.tsx');
  assert.match(posPage, /patchCachedProductsStock/);
  assert.match(posPage, /handleCheckoutSuccess/);
  assert.match(posPage, /lastFullCatalogSyncRef/);
});

test('db.ts indexa comandaId em offline_sales para evitar full scan na finalização', () => {
  const dbTs = readFrontend('src/lib/db.ts');
  assert.match(dbTs, /this\.version\(4\)\.stores/);
  assert.match(dbTs, /where\('comandaId'\)\.equals\(sale\.comandaId\)/);
});

test('PaymentModal cacheia metadados por loja e usa polling escalonado de NFC-e', () => {
  const modal = readFrontend('src/components/PaymentModal.tsx');
  assert.match(modal, /paymentModalMetaCache/);
  assert.match(modal, /POLL_DELAYS_MS/);
  assert.match(modal, /SoldCheckoutItemSummary/);
});
