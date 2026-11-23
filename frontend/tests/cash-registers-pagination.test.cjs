// node --test tests/cash-registers-pagination.test.cjs — garante paginação, filtros e resiliência no Histórico de Caixas.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.join(__dirname, '..');
const readFrontend = (rel) => fs.readFileSync(path.join(frontendRoot, rel), 'utf8');

test('Histórico de Caixas pagina no servidor, filtra por status/código e evita corrida entre trocas de página', () => {
  const page = readFrontend('src/app/dashboard/registers/page.tsx');

  // Parâmetros de paginação/filtros e cancelamento de requisições concorrentes
  assert.match(page, /api\.get\('\/cash-registers'/);
  assert.match(page, /const params: Record<string, string \| number> = \{ page, limit \}/);
  assert.match(page, /if \(statusFilter !== 'all'\) params\.status = statusFilter/);
  assert.match(page, /if \(debouncedSearch\) params\.search = debouncedSearch/);
  assert.match(page, /new AbortController\(\)/);
  assert.match(page, /skipCancelTelemetry: true/);
  assert.match(page, /axios\.isCancel\(error\)/);

  // Retrocompatibilidade com resposta em array ou objeto paginado { data, meta }
  assert.match(page, /Array\.isArray\(payload\) \? payload : \(payload\?\.data \?\? \[\]\)/);
  assert.match(page, /meta\?\.lastPage/);

  // Controles de paginação, seleção de tamanho de página e preservação da página após fechar modal
  assert.match(page, /aria-label="Página anterior"/);
  assert.match(page, /aria-label="Próxima página"/);
  assert.match(page, /value=\{15\}/);
  assert.match(page, /value=\{30\}/);
  assert.match(page, /value=\{50\}/);
  assert.match(page, /value="pending_audit"/);
  assert.match(page, /fetchRegisters\(\{ forceFresh: true, signal: controller\.signal \}\)/);

  // Proteção iOS/layout e colSpan correto (9 colunas)
  assert.match(page, /text-base md:text-sm/);
  assert.match(page, /\[color-scheme:dark\]/);
  assert.match(page, /colSpan=\{9\}/);
});
