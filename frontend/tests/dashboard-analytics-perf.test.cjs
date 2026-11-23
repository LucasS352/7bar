// node --test tests/dashboard-analytics-perf.test.cjs — garante feedback de loading, paralelismo e abort no Dashboard Analytics.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.join(__dirname, '..');
const readFrontend = (rel) => fs.readFileSync(path.join(frontendRoot, rel), 'utf8');

test('Dashboard Analytics exibe loading claro ao trocar filtro/personalizado e busca em paralelo com payload enxuto', () => {
  const page = readFrontend('src/app/dashboard/page.tsx');

  // Busca paralela de resumo e listagem leve + abort em troca rápida
  assert.match(page, /Promise\.all\(\[\s*api\.get\(summaryUrl,\s*reqCfg\),\s*api\.get\(salesUrl,\s*reqCfg\)/s);
  assert.match(page, /view=dashboard/);
  assert.match(page, /new AbortController\(\)/);
  assert.match(page, /skipCancelTelemetry:\s*true/);
  assert.match(page, /controller\.abort\(\)/);

  // Suporte a Enter nas datas customizadas + force refresh no botão lupa
  assert.match(page, /applyCustomDates/);
  assert.match(page, /onKeyDown=\{e => \{ if \(e\.key === 'Enter'\) applyCustomDates\(\); \}\}/);
  assert.match(page, /refresh=1/);

  // Estados visuais claros de carregamento durante troca de mês/personalizado
  assert.match(page, /isRefreshing/);
  assert.match(page, /Carregando dados do período/);
  assert.match(page, /PanelLoadingOverlay/);

  // Polling de NFC-e pendente não dispara mais /dashboard/summary completo a cada 5s
  assert.match(page, /\/sales\/\$\{sale\.id\}\/nfce-status/);
});

test('api.ts ignora telemetria quando aborto de requisição tem skipCancelTelemetry', () => {
  const api = readFrontend('src/lib/api.ts');
  assert.match(api, /skipCancelTelemetry/);
});
