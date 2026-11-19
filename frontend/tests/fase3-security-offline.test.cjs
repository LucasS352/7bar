// node --test tests/fase3-security-offline.test.cjs — sem servidor, navegador ou alterações em bancos.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

const root = path.join(__dirname, '../src');

function loadTs(file, dependencies = {}, globals = {}) {
  const context = {
    exports: {},
    console,
    crypto,
    ...globals,
    require: (id) => {
      if (id in dependencies) return dependencies[id];
      if (id === 'zustand') return require('zustand');
      throw new Error(`Unexpected dependency: ${id}`);
    },
  };
  vm.createContext(context);
  vm.runInContext(
    ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  );
  return context.exports;
}

test('escapeHtml neutraliza tags, aspas e apóstrofos sem perder valores seguros', () => {
  const { escapeHtml } = loadTs('lib/escape-html.ts');
  assert.equal(escapeHtml('<script>alert("xss\'&")</script>'), '&lt;script&gt;alert(&quot;xss&#39;&amp;&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml('Cerveja Heineken 600ml'), 'Cerveja Heineken 600ml');
});

test('cart.ts não muta array de modificadores, diferencia quantidades e arredonda centavos', () => {
  const memory = new Map();
  const sessionStorage = { getItem: (k) => memory.get(k), setItem: (k, v) => memory.set(k, v) };
  const { useCartStore } = loadTs('store/cart.ts', {}, { sessionStorage });
  useCartStore.getState().selectScope('adega-1', 'op-1');

  const mods = [
    { groupId: 'g2', groupName: 'G2', optionId: 'o2', optionName: 'B', componentProductId: 'c2', quantity: 2, priceAdjustment: 0.2 },
    { groupId: 'g1', groupName: 'G1', optionId: 'o1', optionName: 'A', componentProductId: 'c1', quantity: 1, priceAdjustment: 0.1 },
  ];
  const snapshotBefore = mods.map((m) => m.groupId);
  useCartStore.getState().addItem({ id: 'p1', name: 'Combo', priceSell: 10, stock: 5, barcode: null, shortCode: null }, 1, mods);

  assert.deepEqual(mods.map((m) => m.groupId), snapshotBefore);
  const item1 = useCartStore.getState().items[0];
  assert.equal(item1.effectivePriceSell, 10.3);
  assert.equal(item1.subtotal, 10.3);
  assert.match(item1.cartKey, /g1:o1:1\|g2:o2:2/);
});

test('comandas-offline trata HTTP 5xx como transitório para fallback em cache e ignora vendas REVIEW', async () => {
  const cachedComandas = [
    { id: 'c-review', number: '01', items: [] },
    { id: 'c-pending', number: '02', items: [] },
    { id: 'c-open', number: '03', items: [] },
  ];
  const offlineSales = [
    { tenantId: 'adega-a', comandaId: 'c-review', syncStatus: 'REVIEW' },
    { tenantId: 'adega-a', comandaId: 'c-pending', syncStatus: 'PENDING' },
  ];

  const makeChain = (rows) => {
    let filtered = rows;
    return {
      equals: (v) => makeChain(filtered.filter((r) => r.tenantId === v)),
      filter: (fn) => makeChain(filtered.filter(fn)),
      toArray: async () => filtered,
      first: async () => filtered[0],
    };
  };

  const dbMock = {
    offline_sales: { where: () => makeChain(offlineSales) },
    comandas_cache: {
      get: async () => ({ tenantId: 'adega-a', savedAt: 12345, items: cachedComandas }),
      put: async () => {},
    },
  };

  const mod = loadTs('lib/comandas-offline.ts', {
    './api': { api: { get: async () => { throw { response: { status: 503 } }; } } },
    './db': { db: dbMock },
    '@/store/auth': { useAuthStore: { getState: () => ({ user: { tenant: 'adega-a' } }) } },
  }, { navigator: { onLine: true } });

  const list = await mod.readComandas('adega-a', { silent: true });
  assert.equal(list.offline, true);
  assert.deepEqual(list.items.map((c) => c.id), ['c-review', 'c-open']);

  const detail = await mod.readComanda('adega-a', 'c-review');
  assert.equal(detail.offline, true);
  assert.equal(detail.data.id, 'c-review');

  await assert.rejects(mod.readComanda('adega-a', 'c-pending'), /possui cobrança neste aparelho/);
});

test('db.ts isola products_cache por tenantId e desconsidera vendas REVIEW ao checar comanda', async () => {
  const source = fs.readFileSync(path.join(root, 'lib/db.ts'), 'utf8');
  const ast = ts.createSourceFile('db.ts', source, ts.ScriptTarget.Latest, true);
  const pickFn = (name) => ast.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === name).getText(ast);

  const productsRows = [];
  const salesRows = [{ id: 1, tenantId: 'shop-1', localId: 'op-old', comandaId: 'cmd-1', syncStatus: 'REVIEW' }];
  const fakeDb = {
    transaction: async (_mode, _table, work) => work(),
    products_cache: {
      clear: async () => { productsRows.length = 0; },
      bulkPut: async (items) => { productsRows.push(...items); },
      toArray: async () => [...productsRows],
    },
    offline_sales: {
      where: (field) => ({
        equals: (val) => {
          const base = salesRows.filter((r) => r[field] === val);
          return {
            filter: (fn) => ({ first: async () => base.find(fn) }),
          };
        },
      }),
      add: async (row) => { salesRows.push({ ...row, id: salesRows.length + 1 }); return salesRows.length; },
    },
  };

  const ctx = { exports: {}, db: fakeDb };
  vm.createContext(ctx);
  for (const fn of ['updateProductsCache', 'getCachedProducts', 'clearProductsCache', 'saveOfflineSale']) {
    vm.runInContext(
      ts.transpileModule(pickFn(fn), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
      ctx,
    );
  }

  await ctx.exports.updateProductsCache([{ id: 'p1', name: 'Produto A' }], 'shop-1');
  assert.equal((await ctx.exports.getCachedProducts('shop-1')).length, 1);
  assert.equal((await ctx.exports.getCachedProducts('shop-2')).length, 0);
  await ctx.exports.clearProductsCache();
  assert.equal((await ctx.exports.getCachedProducts('shop-1')).length, 0);

  const addedId = await ctx.exports.saveOfflineSale({
    localId: 'op-new', tenantId: 'shop-1', operatorId: 'op-1', comandaId: 'cmd-1', syncStatus: 'PENDING',
  });
  assert.equal(addedId, 2);
});

test('credenciais e rotas críticas de segurança não mantêm segredos hardcoded ou senhas em Base64', () => {
  const sysInit = fs.readFileSync(path.join(root, 'app/sys-init/page.tsx'), 'utf8');
  const loginPage = fs.readFileSync(path.join(root, 'pages/LoginPage.tsx'), 'utf8');
  const comandasPage = fs.readFileSync(path.join(root, 'pages/dashboard/ComandasPage.tsx'), 'utf8');
  const importsPage = fs.readFileSync(path.join(root, 'app/dashboard/inventory/purchases/imports/page.tsx'), 'utf8');
  const inventoryPage = fs.readFileSync(path.join(root, 'app/dashboard/inventory/page.tsx'), 'utf8');

  assert.doesNotMatch(sysInit, /43619835/);
  assert.doesNotMatch(sysInit, /download-all\?pin=/);
  assert.doesNotMatch(sysInit, /download\/\$\{file\.path\}\?pin=/);
  assert.match(sysInit, /URL\.revokeObjectURL/);

  assert.doesNotMatch(loginPage, /encodePass|btoa\(/);
  assert.doesNotMatch(loginPage, /localStorage\.setItem\(['"]pdv_remember_pass['"]/);

  assert.match(comandasPage, /navigate\('\/'\)/);
  assert.doesNotMatch(importsPage, /\/v1\/company\/config/);
  assert.match(inventoryPage, /\/products\/lots\/register-existing\//);
});
