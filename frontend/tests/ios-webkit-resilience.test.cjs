// node --test tests/ios-webkit-resilience.test.cjs — valida proteções contra auto-zoom, safe areas e overflow no iPhone/Safari.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.join(__dirname, '..');
const readFrontend = (rel) => fs.readFileSync(path.join(frontendRoot, rel), 'utf8');

test('index.html e globals.css aplicam proteções globais contra auto-zoom, duplo toque e sobreposição de status bar no iOS', () => {
  const html = readFrontend('index.html');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /name="apple-mobile-web-app-status-bar-style"\s+content="black"/);

  const css = readFrontend('src/app/globals.css');
  assert.match(css, /-webkit-text-size-adjust:\s*100%/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /@media\s*\(pointer:\s*coarse\)/);
  assert.match(css, /font-size:\s*max\(16px,\s*1rem\)/);
  assert.match(css, /height:\s*100dvh/);
});

test('DashboardLayout, BottomNavigation, PaymentModal e Dashboard Analytics respeitam safe-area, dvh e min-w-0 no iPhone', () => {
  const dashLayout = readFrontend('src/layouts/DashboardLayout.tsx');
  assert.match(dashLayout, /ios-viewport/);
  assert.match(dashLayout, /overflow-y-auto overflow-x-hidden/);
  assert.match(dashLayout, /safe-area-inset-top/);

  const bottomNav = readFrontend('src/components/BottomNavigation.tsx');
  assert.match(bottomNav, /min-h-16/);
  assert.match(bottomNav, /min-h-\[60px\]/);
  assert.match(bottomNav, /max-h-\[90dvh\]/);

  const paymentModal = readFrontend('src/components/PaymentModal.tsx');
  assert.match(paymentModal, /safe-area-inset-top/);
  assert.match(paymentModal, /safe-area-inset-bottom/);
  assert.match(paymentModal, /ios-viewport/);

  const analytics = readFrontend('src/app/dashboard/page.tsx');
  assert.match(analytics, /\[color-scheme:dark\]/);
  assert.match(analytics, /allowEscapeViewBox=\{\{\s*x:\s*false,\s*y:\s*false\s*\}\}/);
  assert.match(analytics, /min-w-0 bg-zinc-900/);
});
