const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/purchase-draft.ts'), 'utf8');
const context = { exports: {} };
vm.createContext(context);
vm.runInContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, context);
const { purchaseDraftKey, parsePurchaseDraft, suggestedPurchase, buildPurchaseMessage } = context.exports;

test('draft keys isolate tenant and user identities', () => {
  assert.notEqual(purchaseDraftKey('tenant-a', 'owner'), purchaseDraftKey('tenant-b', 'owner'));
  assert.notEqual(purchaseDraftKey('tenant-a', 'owner'), purchaseDraftKey('tenant-a', 'manager'));
  assert.equal(purchaseDraftKey('', 'owner'), null);
});

test('stored draft rejects invalid quantities and duplicate product IDs', () => {
  const result = parsePurchaseDraft(JSON.stringify({
    days: 30, notes: 'Conferir validade', items: [
      { productId: 'p1', name: 'Produto 1', unit: 'UN', quantity: 12 },
      { productId: 'p1', name: 'Produto 1', unit: 'UN', quantity: 99 },
      { productId: 'p2', name: 'Produto 2', unit: 'UN', quantity: -5 },
    ],
  }));
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].quantity, 12);
  assert.equal(parsePurchaseDraft('{broken').items.length, 0);
});

test('purchase suggestion uses sales baseline and only subtracts confirmed stock', () => {
  const inventory = { stock: 4, minimum: 2, pending: 3 };
  assert.equal(suggestedPurchase(30, 30, inventory, true), 25);
  assert.equal(suggestedPurchase(30, 30, inventory, false), 30);
  assert.equal(suggestedPurchase(30, 30, null, true), 30);
  assert.equal(suggestedPurchase(0, 30, null, true), 0);
});

test('WhatsApp text contains only the chosen quantities and requires user confirmation', () => {
  const text = buildPurchaseMessage({
    days: 30,
    notes: 'Conferir\nvalidade',
    items: [{ productId: 'p1', name: 'Cerveja\nLata', unit: 'UN', quantity: 24 }],
  });
  assert.match(text, /Cerveja Lata — 24 UN/);
  assert.match(text, /Observações: Conferir validade/);
  assert.match(text, /Nenhum pedido foi enviado ao fornecedor/);
});
