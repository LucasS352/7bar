// node --test tests/sys-init-billing-layout.test.cjs — garante mini calendário + vencimentos + clientes em tela única no Sys-Init.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srcRoot = path.join(__dirname, '../src');
const readSrc = (rel) => fs.readFileSync(path.join(srcRoot, rel), 'utf8');

test('SysInitPage exibe TenantBillingCalendar e cards de clientes juntos na mesma tela sem alternador Calendario/Clientes', () => {
  const sysInit = readSrc('app/sys-init/page.tsx');
  assert.match(sysInit, /<TenantBillingCalendar/);
  assert.match(sysInit, /filteredTenants\.map/);
  assert.doesNotMatch(sysInit, /setTenantView/);
  assert.doesNotMatch(sysInit, /tenantView ===/);
});

test('TenantBillingCalendar usa mini calendario compacto com marcacao por dia e listinha lateral de vencimentos do mes', () => {
  const calendar = readSrc('components/TenantBillingCalendar.tsx');
  assert.match(calendar, /Agenda de vencimentos/);
  assert.match(calendar, /Do mês \(/);
  assert.match(calendar, /Atrasados \(/);
  assert.match(calendar, /Sem data \(/);
  assert.match(calendar, /Limpar dia/);
  assert.doesNotMatch(calendar, /min-h-28/);
  assert.doesNotMatch(calendar, /min-w-\[700px\]/);
});
