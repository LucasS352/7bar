// node --test tests/fase5-leadger-integration.test.cjs — verifica UI Leadger no Sys-Init sem vazamento de segredos.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srcRoot = path.join(__dirname, '../src');
const readSrc = (rel) => fs.readFileSync(path.join(srcRoot, rel), 'utf8');

test('LeadgerPanel integra os endpoints /tenants/setup/leadger com PIN sem armazenar segredos no frontend', () => {
  const panel = readSrc('components/LeadgerPanel.tsx');
  assert.match(panel, /\/tenants\/setup\/leadger\/status/);
  assert.match(panel, /\/tenants\/setup\/leadger\/outbox/);
  assert.match(panel, /\/tenants\/setup\/leadger\/clients/);
  assert.match(panel, /\/tenants\/setup\/leadger\/reconciliation/);
  assert.match(panel, /\/tenants\/setup\/leadger\/batch-sync/);
  assert.match(panel, /x-setup-pin/);
  assert.match(panel, /sanitizeCsv/);
  assert.match(panel, /URL\.revokeObjectURL/);
  assert.match(panel, /TenantLeadgerFinanceSection/);
  assert.match(panel, /\/refund/);
  assert.doesNotMatch(panel, /LEADGER_WEBHOOK_SECRET/);
});

test('SysInitPage registra aba Leadger e secao de faturas/estorno na aba Financeiro', () => {
  const sysInit = readSrc('app/sys-init/page.tsx');
  assert.match(sysInit, /import\s+\{\s*LeadgerPanel,\s*TenantLeadgerFinanceSection\s*\}\s+from\s+"@\/components\/LeadgerPanel"/);
  assert.match(sysInit, /setActiveTab\('leadger'\)/);
  assert.match(sysInit, /<LeadgerPanel/);
  assert.match(sysInit, /<TenantLeadgerFinanceSection/);
  assert.doesNotMatch(sysInit, /LEADGER_WEBHOOK_SECRET/);
});
