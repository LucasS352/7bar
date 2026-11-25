// node --test tests/sales-resilience.test.cjs — no browser database, server or real sales.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.join(__dirname, '../src');
function load(file, dependencies = {}, globals = {}) {
  const context = { exports: {}, console, crypto, ...globals, require: id => {
    if (id in dependencies) return dependencies[id];
    if (id === 'zustand') return require('zustand');
    throw new Error(`Unexpected dependency: ${id}`);
  } };
  vm.createContext(context);
  vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  return context.exports;
}
function checkoutHarness({ failSave = false, failAck = false, cancelled = false } = {}) {
  const rows = [];
  const db = {
    saveOfflineSale: async sale => { if (failSave) throw new Error('QuotaExceededError'); rows.push({ ...sale }); },
    markSaleSynced: async () => { if (failAck) throw new Error('IndexedDB unavailable'); rows[0].syncStatus = 'SYNCED'; },
    markSaleError: async () => { rows[0].syncStatus = 'ERROR'; },
    markSaleReview: async () => { rows[0].syncStatus = 'REVIEW'; },
  };
  const { submitDurableCheckout } = load('lib/durable-checkout.ts', {
    './db': db, './sale-operation-lock': { withSaleOperationLock: async (_t, _id, work) => work() },
    './reconcile-comanda-checkout': { reconcileCancelledComandaCheckout: async () => {
      if (cancelled) rows[0].syncStatus = 'REJECTED';
      return cancelled;
    } },
  });
  return { rows, submit: send => submitDurableCheckout({ tenantId: 'shop', localId: 'operation', syncStatus: 'SYNCING' }, send) };
}
test('IndexedDB failure: no POST and no successful contingency', async () => {
  const h = checkoutHarness({ failSave: true }); let sends = 0;
  await assert.rejects(h.submit(async () => { sends++; }), /QuotaExceededError/);
  assert.equal(sends, 0); assert.equal(h.rows.length, 0);
});
test('persist before POST, then acknowledge same operation', async () => {
  const h = checkoutHarness();
  const result = await h.submit(async () => { assert.equal(h.rows.length, 1); return { data: { id: 'server-sale' } }; });
  assert.equal(result.kind, 'confirmed'); assert.equal(h.rows[0].syncStatus, 'SYNCED');
});
test('lost response retains the original identity and pending snapshot', async () => {
  const h = checkoutHarness();
  const result = await h.submit(async () => { throw { code: 'ERR_NETWORK' }; });
  assert.equal(result.kind, 'pending'); assert.equal(h.rows[0].localId, 'operation'); assert.equal(h.rows[0].syncStatus, 'ERROR');
});
test('business refusal is retained for review, not automatic resend', async () => {
  const h = checkoutHarness();
  const result = await h.submit(async () => { throw { response: { status: 409, data: { message: 'Comanda alterada' } } }; });
  assert.equal(result.kind, 'review'); assert.equal(h.rows[0].syncStatus, 'REVIEW');
});

test('confirmed cancelled comanda refusal releases the checkout from review', async () => {
  const h = checkoutHarness({ cancelled: true });
  const result = await h.submit(async () => { throw { response: { status: 400, data: { message: 'Comanda cancelada' } } }; });
  assert.equal(result.kind, 'rejected');
  assert.equal(h.rows.length, 1);
  assert.equal(h.rows[0].syncStatus, 'REJECTED');
});

test('cancelled comanda reconciliation checks tenant and server identity', async () => {
  const requests = []; let changed = 0;
  const reconcile = load('lib/reconcile-comanda-checkout.ts', {
    './api': { api: { get: async (url, config) => {
      requests.push({ url, config });
      return { data: { id: 'comanda-1', status: 'cancelled' } };
    } } },
    './db': { markCancelledComandaSaleRejected: async () => { changed++; return true; } },
  }).reconcileCancelledComandaCheckout;
  assert.equal(await reconcile({ localId: 'sale-1', tenantId: 'shop', comandaId: 'comanda-1' }), true);
  assert.equal(requests[0].url, '/v1/comandas/comanda-1');
  assert.equal(requests[0].config.expectedTenantId, 'shop');
  assert.equal(changed, 1);
  assert.equal(await reconcile({ localId: 'sale-2', tenantId: 'shop', comandaId: 'other' }), false);
  assert.equal(changed, 1);
});
test('local programming error is not announced as a successful offline sale', async () => {
  const h = checkoutHarness();
  assert.equal((await h.submit(async () => { throw new TypeError('bug'); })).kind, 'review');
});
test('acknowledgement storage failure keeps SYNCING recoverable, without another POST', async () => {
  const h = checkoutHarness({ failAck: true }); let sends = 0;
  assert.equal((await h.submit(async () => { sends++; return { data: { id: 'server-sale' } }; })).kind, 'confirmed');
  assert.equal(sends, 1); assert.equal(h.rows[0].syncStatus, 'SYNCING');
});
test('cross-tab lock skips an active sender; browser without locks falls back gracefully', async () => {
  let runs = 0;
  const locks = load('lib/sale-operation-lock.ts', {}, { navigator: { locks: { request: async (_name, options, callback) => {
    assert.equal(options.ifAvailable, true); return callback(null);
  } } } });
  await assert.rejects(locks.withSaleOperationLock('shop', 'operation', async () => runs++), /outra aba/);
  assert.equal(runs, 0);
  const unavailable = load('lib/sale-operation-lock.ts', {}, { navigator: {} });
  await unavailable.withSaleOperationLock('shop', 'operation', async () => runs++);
  assert.equal(runs, 1);
});
test('F5 reload restores scoped draft identity and items; another operator gets another draft', () => {
  const memory = new Map(); const sessionStorage = { getItem: k => memory.get(k), setItem: (k, v) => memory.set(k, v) };
  const first = load('store/cart.ts', {}, { sessionStorage }).useCartStore;
  first.getState().selectScope('shop', 'operator');
  first.getState().addItem({ id: 'product', name: 'Test', priceSell: 10 }, 1);
  const key = first.getState().cartOperationId;
  const reloaded = load('store/cart.ts', {}, { sessionStorage }).useCartStore;
  reloaded.getState().selectScope('shop', 'operator');
  assert.equal(reloaded.getState().cartOperationId, key); assert.equal(reloaded.getState().items.length, 1);
  reloaded.getState().selectScope('shop', 'another-operator');
  assert.equal(reloaded.getState().items.length, 0); assert.notEqual(reloaded.getState().cartOperationId, key);
});

test('last comanda item removal detaches the cart and keeps counter extras as a new sale', () => {
  const cart = { activeComandaId: 'comanda-1', activeComandaNumber: '12', isOperationLocked: false,
    items: [{ cartKey: 'old', fromComanda: true, subtotal: 3.5 }, { cartKey: 'extra', fromComanda: false, subtotal: 4 }],
    total: 7.5, cartOperationId: 'old-operation' };
  const useCartStore = { getState: () => cart, setState: patch => Object.assign(cart, patch) };
  const { syncLoadedComanda } = load('lib/comanda-cart.ts', { '@/store/cart': { useCartStore } });
  syncLoadedComanda({ id: 'comanda-1', status: 'cancelled', items: [{ id: 'old', status: 'removed' }] });
  assert.equal(cart.activeComandaId, null);
  assert.equal(cart.activeComandaNumber, null);
  assert.equal(cart.items.length, 1);
  assert.equal(cart.items[0].cartKey, 'extra');
  assert.equal(cart.total, 4);
  assert.notEqual(cart.cartOperationId, 'old-operation');
});
function leaveHarness(readSale = async () => undefined) {
  const memory = new Map();
  const sessionStorage = { getItem: k => memory.get(k), setItem: (k, v) => memory.set(k, v) };
  const store = load('store/cart.ts', {}, { sessionStorage }).useCartStore;
  store.getState().selectScope('shop', 'operator');
  store.getState().setActiveComanda('table-1', '12');
  store.getState().addItem({ id: 'drink', name: 'Drink', priceSell: 5 }, 2, undefined, true);
  const leave = load('lib/leave-comanda-checkout.ts', {
    '@/store/cart': { useCartStore: store }, './db': { getOfflineSale: readSale },
  }).leaveComandaCheckout;
  return { store, leave, sessionStorage };
}

test('leaving unsubmitted comanda keeps extras as counter sale and persists detachment after reload', async () => {
  const h = leaveHarness(async (tenant, operation) => {
    assert.equal(tenant, 'shop'); assert.equal(operation, oldId); return undefined;
  });
  const oldId = h.store.getState().cartOperationId;
  h.store.getState().addItem({ id: 'extra', name: 'Extra', priceSell: 3.5 }, 2);
  await h.leave('shop', 'operator');
  const cart = h.store.getState();
  assert.equal(cart.activeComandaId, null); assert.equal(cart.activeComandaNumber, null);
  assert.equal(cart.items.length, 1); assert.equal(cart.items[0].id, 'extra'); assert.equal(cart.total, 7);
  assert.notEqual(cart.cartOperationId, oldId); assert.equal(cart.isOperationLocked, false);
  const restored = load('store/cart.ts', {}, { sessionStorage: h.sessionStorage }).useCartStore;
  restored.getState().selectScope('shop', 'operator');
  assert.equal(restored.getState().activeComandaId, null);
  assert.equal(restored.getState().items.length, 1);
});

test('leaving comanda without extras releases an empty cart for a new sale', async () => {
  const h = leaveHarness(); await h.leave('shop', 'operator');
  assert.equal(h.store.getState().total, 0); assert.equal(h.store.getState().items.length, 0);
  h.store.getState().addItem({ id: 'new', name: 'New', priceSell: 2 });
  assert.equal(h.store.getState().items[0].fromComanda, false);
  assert.equal(h.store.getState().activeComandaId, null);
});

test('submitted operations, storage errors and active checkout cannot be detached', async () => {
  for (const syncStatus of ['PENDING', 'SYNCING', 'ERROR', 'REVIEW', 'SYNCED']) {
    const h = leaveHarness(async () => ({ syncStatus })); const id = h.store.getState().cartOperationId;
    await assert.rejects(h.leave('shop', 'operator'), /já foi enviada/);
    assert.equal(h.store.getState().activeComandaId, 'table-1'); assert.equal(h.store.getState().cartOperationId, id);
  }
  const h = leaveHarness(async () => { throw new Error('Storage unavailable'); });
  await assert.rejects(h.leave('shop', 'operator'), /Storage unavailable/);
  assert.equal(h.store.getState().isOperationLocked, false); assert.equal(h.store.getState().items.length, 1);
  h.store.getState().setOperationLocked(true);
  await assert.rejects(h.leave('shop', 'operator'), /Aguarde/);
  assert.equal(h.store.getState().isOperationLocked, true);
});

test('operator change during leave verification cannot clear the new operator cart', async () => {
  let finish; const h = leaveHarness(() => new Promise(resolve => { finish = resolve; }));
  const pending = h.leave('shop', 'operator');
  assert.equal(h.store.getState().isOperationLocked, true);
  h.store.getState().selectScope('shop', 'other');
  h.store.getState().addItem({ id: 'other-item', name: 'Other', priceSell: 8 });
  finish(undefined);
  await assert.rejects(pending, /carrinho mudou/);
  assert.equal(h.store.getState().total, 8);
  await assert.rejects(h.leave('shop', 'operator'), /Operador alterado/);
});

test('recovery query includes interrupted SYNCING but excludes other shops/operators and REVIEW', async () => {
  const source = fs.readFileSync(path.join(root, 'lib/db.ts'), 'utf8');
  const ast = ts.createSourceFile('db.ts', source, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === 'getPendingSales');
  const rows = ['SYNCING', 'PENDING', 'REVIEW', 'SYNCED'].map(syncStatus => ({ syncStatus, tenantId: 'shop', operatorId: 'op' }));
  rows.push({ syncStatus: 'SYNCING', tenantId: 'another', operatorId: 'op' });
  let selected = rows;
  const query = { anyOf: statuses => { selected = selected.filter(r => statuses.includes(r.syncStatus)); return query; },
    filter: predicate => { selected = selected.filter(predicate); return query; }, sortBy: async () => selected };
  const ctx = { exports: {}, db: { offline_sales: { where: () => query } } };
  vm.createContext(ctx);
  vm.runInContext(ts.transpileModule(declaration.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  const result = await ctx.exports.getPendingSales('shop', 'op');
  assert.equal(result.length, 2); assert(result.some(r => r.syncStatus === 'SYNCING'));
  assert.equal((await ctx.exports.getPendingSales()).length, 0);
});

test('optimized direct checkout has explicit timeout of 35s and expected identity', async () => {
  let config;
  const module = load('lib/checkout-api.ts', { './api': {
    api: { post: async (_url, _body, options) => { config = options; return { data: { id: 'sale' } }; } },
  } });
  await module.sendCheckout({}, 'shop', 'op');
  assert.equal(config.timeout, 35000); assert.equal(config.expectedTenantId, 'shop'); assert.equal(config.expectedOperatorId, 'op');
});

test('unresponsive HTTP checkout times out and preserves the operation (loopback only)', async () => {
  const http = require('node:http');
  const axios = require('axios');
  const sockets = new Set(); let posts = 0;
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      if (req.url.includes('checkout-capabilities')) {
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"protocol":2}');
      } else { posts++; /* Deliberately no response, simulating a stalled connection. */ }
    });
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const api = axios.create({ baseURL: `http://127.0.0.1:${server.address().port}` });
    const module = load('lib/checkout-api.ts', { './api': { api, apiGet: (url, config) => api.get(url, { ...config, timeout: 10000 }) } });
    const h = checkoutHarness(); const started = Date.now();
    const result = await h.submit(() => module.sendCheckout({ idempotencyKey: 'operation' }, 'shop', 'op'));
    assert.equal(result.kind, 'pending'); assert.equal(h.rows[0].localId, 'operation');
    assert.equal(h.rows[0].syncStatus, 'ERROR'); assert.equal(posts, 1);
    assert(Date.now() - started >= 9000);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
  }
});
