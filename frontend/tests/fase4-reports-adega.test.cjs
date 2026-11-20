// node --test tests/fase4-reports-adega.test.cjs — verifica roteamento, seguranca e exportacao do modulo de Relatorios.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srcRoot = path.join(__dirname, '../src');
const readSrc = (rel) => fs.readFileSync(path.join(srcRoot, rel), 'utf8');

test('rota /dashboard/reports registrada em main.tsx e protegida para perfis administrativos', () => {
  const main = readSrc('main.tsx');
  assert.match(main, /import ReportsPage from '\.\/pages\/dashboard\/ReportsPage'/);
  assert.match(main, /<Route path="reports" element=\{<ReportsPage \/>\} \/>/);
});

test('DashboardLayout e BottomNavigation expoem link de Relatorios apenas para nao-estoquistas', () => {
  const layout = readSrc('layouts/DashboardLayout.tsx');
  assert.match(layout, /to:\s*'\/dashboard\/reports'/);
  assert.match(layout, /stockistAllowedPaths\s*=\s*\['\/dashboard\/inventory',\s*'\/dashboard\/bulk-images'\]/);

  const bottomNav = readSrc('components/BottomNavigation.tsx');
  assert.match(bottomNav, /user\?\.role !== 'stockist'/);
  assert.match(bottomNav, /navigate\('\/dashboard\/reports'\)/);
});

test('ReportsPage consulta endpoints de lucro, ranking e insights com AbortController e sanitizacao CSV', () => {
  const page = readSrc('pages/dashboard/ReportsPage.tsx');
  assert.match(page, /\['admin', 'superadmin'\]\.includes\(user\?\.role \?\? ''\)/);
  assert.match(page, /\/reports\/sales/);
  assert.match(page, /\/reports\/products-ranking/);
  assert.match(page, /\/reports\/adega-insights/);
  assert.match(page, /new AbortController\(\)/);
  assert.match(page, /controller\.abort\(\)/);
  assert.match(page, /sanitizeCsvCell/);
  assert.match(page, /\\t\\r\]/);
  assert.match(page, /URL\.revokeObjectURL\(url\)/);
  assert.match(page, /days < 1 \|\| days > 92/);
});

test('AdegaInsightsPanel, SalesEvolution e ReportsPage exibem lucro real, graficos e baloes explicativos com seguranca', () => {
  const panel = readSrc('pages/dashboard/AdegaInsightsPanel.tsx');
  const evolution = readSrc('pages/dashboard/SalesEvolution.tsx');
  const page = readSrc('pages/dashboard/ReportsPage.tsx');
  const balloon = readSrc('components/InfoBalloon.tsx');
  assert.doesNotMatch(panel, /dangerouslySetInnerHTML|innerHTML/);
  assert.doesNotMatch(evolution, /dangerouslySetInnerHTML|innerHTML/);
  assert.doesNotMatch(balloon, /dangerouslySetInnerHTML|innerHTML/);
  assert.match(panel, /Lucro/i);
  assert.match(panel, /Risco de Ruptura/);
  assert.match(panel, /Capital Parado/);
  assert.match(evolution, /grossProfit/);
  assert.match(evolution, /totalCost/);
  assert.match(evolution, /PeriodComparisonBar/);
  assert.match(evolution, /FinancialEvolutionChart/);
  assert.match(page, /InfoBalloon/);
  assert.match(page, /uncostedProducts/);
  assert.match(balloon, /role="tooltip"/);
});
