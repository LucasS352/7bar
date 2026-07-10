/**
 * ============================================================
 *  db.ts — IndexedDB com Dexie.js
 *  7bar PDV — Persistência Offline
 * ============================================================
 *
 *  Tabelas:
 *    - offline_sales   : vendas realizadas sem conexão (OFFLINE_CONTINGENCY)
 *    - products_cache  : snapshot do catálogo para uso offline
 *
 *  O snapshot fiscal (tributos) é congelado no momento da venda,
 *  garantindo conformidade mesmo que o catálogo mude depois.
 * ============================================================
 */

import Dexie, { type Table } from 'dexie';

// ── Tipos base compartilhados com o backend ──────────────────────────────────

/** Snapshot fiscal imutável de um item — espelha o modelo SaleItem do Prisma */
export interface OfflineSaleItemSnapshot {
  productId: string;
  productName: string;   // nome no momento da venda (congelado)
  unit: string;
  quantity: number;
  priceUnit: number;
  discount: number;
  subtotal: number;

  // Snapshot fiscal — congelado no momento da venda (NÃO alterar)
  ncm:        string | null;
  cest:       string | null;
  cfop:       string;        // ex: '5102'
  origem:     number;        // 0=Nacional

  // ICMS — apenas um dos dois é preenchido (SN ou Regime Normal)
  csosn:      string | null; // Simples Nacional: '102', '400', '500'
  cstIcms:    string | null; // Regime Normal:    '00', '10', '20', '60'
  aliqIcms:   number;
  valorIcms:  number;

  // PIS
  cstPis:     string;        // '99' = SN
  aliqPis:    number;
  valorPis:   number;

  // COFINS
  cstCofins:  string;
  aliqCofins: number;
  valorCofins: number;
}

/** Forma de pagamento — espelha o modelo Payment do Prisma */
export interface OfflineSalePayment {
  method: 'dinheiro' | 'pix' | 'credito' | 'debito' | 'outros';
  tPag:   string;  // código SEFAZ: 01=Dinheiro, 17=PIX, 03=Crédito, 04=Débito
  value:  number;
  troco:  number;
}

// ── Status de sincronização ──────────────────────────────────────────────────

export type SyncStatus =
  | 'PENDING'             // Aguardando sync (criada offline)
  | 'SYNCING'             // Em processo de envio
  | 'SYNCED'              // Confirmada no backend
  | 'ERROR';              // Falhou ao sincronizar

// ── Modelo principal da venda offline ────────────────────────────────────────

/**
 * OfflineSale — representa uma venda realizada em modo de contingência offline.
 *
 * A propriedade `fiscalSnapshot` garante que os dados tributários
 * (CFOP, CSOSN, NCM, alíquotas) são a FOTO do momento da venda,
 * independente de qualquer alteração futura no catálogo.
 *
 * syncStatus = 'PENDING' indica que a venda precisa ser enviada ao backend.
 */
export interface OfflineSale {
  id?: number;            // auto-increment (chave primária do IndexedDB)
  localId: string;        // UUID v4 gerado no cliente — idempotência no sync

  // Metadados da operação
  createdAt:  string;     // ISO 8601 — momento exato da venda
  operatorId: string;     // ID do usuário operador
  tenantId:   string;     // ID do tenant (Adega)
  cashRegisterId?: string; // ID do caixa aberto no momento (se houver)

  // Valores financeiros
  subtotal: number;
  discount: number;
  total:    number;

  // Itens com snapshot fiscal imutável
  items: OfflineSaleItemSnapshot[];

  // Formas de pagamento
  payments: OfflineSalePayment[];

  // Dados do consumidor (opcional, para NFC-e futura)
  customerCpf?:  string;
  customerName?: string;

  // Vendas offline NUNCA emitem NFC-e no momento da venda
  // (emissão fiscal requer conexão com SEFAZ)
  emitirNfce: false;

  // ── Status de sincronização ─────────────────────────────────────────────
  syncStatus:   SyncStatus;
  syncedAt?:    string;   // ISO 8601 — quando foi sincronizada com sucesso
  syncError?:   string;   // mensagem de erro se syncStatus = 'ERROR'
  backendSaleId?: string; // ID da venda no backend após sincronização
}

// ── Cache de Produtos ────────────────────────────────────────────────────────

/**
 * CachedProduct — snapshot do catálogo de produtos para uso offline.
 * Inclui dados fiscais para montar o snapshot no momento da venda.
 */
export interface CachedProduct {
  id:        string;   // chave primária (mesmo ID do backend)
  name:      string;
  shortCode: string | null;
  barcode:   string | null;
  unit:      string;
  priceSell: number;
  stock:     number;
  active:    boolean;

  // Dados fiscais do produto (vindos do GrupoTributacao)
  ncm:        string | null;
  cest:       string | null;
  origem:     number;
  cfop:       string;
  csosn:      string | null;
  cstIcms:    string | null;
  aliqIcms:   number;
  cstPis:     string;
  aliqPis:    number;
  cstCofins:  string;
  aliqCofins: number;

  // Produto composto / com adicionais
  isComposite?: boolean;
  modifierGroups?: any[];  // grupos de modificadores/adicionais

  // Metadados do cache
  cachedAt: number;   // Date.now() — para expiração do cache
  salesCount?: number;
  imageUrl?: string | null;
}

// ── Definição do banco Dexie ─────────────────────────────────────────────────

class SevenBarDatabase extends Dexie {
  offline_sales!: Table<OfflineSale, number>;
  products_cache!: Table<CachedProduct, string>;

  constructor() {
    super('7bar_pdv');

    this.version(1).stores({
      /**
       * Índices da tabela offline_sales:
       * - ++id          : auto-increment PK
       * - localId       : UUID único por venda (idempotência)
       * - syncStatus    : para filtrar PENDING / SYNCED
       * - createdAt     : para ordenar por data
       * - tenantId      : isolamento por empresa
       */
      offline_sales: '++id, localId, syncStatus, createdAt, tenantId',

      /**
       * Índices da tabela products_cache:
       * - id      : PK (UUID do backend)
       * - name    : busca por nome
       * - barcode : busca por código de barras
       * - shortCode: busca por código curto
       */
      products_cache: 'id, name, barcode, shortCode',
    });
  }
}

/** Instância singleton do banco — use esta em todo o app */
export const db = new SevenBarDatabase();

// ── Helpers de acesso ao banco ────────────────────────────────────────────────

/** Retorna todas as vendas com syncStatus = 'PENDING', ordenadas por data */
export async function getPendingSales(): Promise<OfflineSale[]> {
  return db.offline_sales
    .where('syncStatus')
    .anyOf(['PENDING', 'ERROR'])
    .sortBy('createdAt');
}

/** Salva uma venda offline e retorna o ID local */
export async function saveOfflineSale(
  sale: Omit<OfflineSale, 'id'>
): Promise<number> {
  return db.offline_sales.add(sale);
}

/** Marca uma venda como SYNCED após envio bem-sucedido ao backend */
export async function markSaleSynced(
  localId: string,
  backendSaleId: string
): Promise<void> {
  await db.offline_sales
    .where('localId')
    .equals(localId)
    .modify({
      syncStatus:   'SYNCED',
      syncedAt:     new Date().toISOString(),
      backendSaleId,
    });
}

/** Marca uma venda como ERROR após falha de sincronização */
export async function markSaleError(
  localId: string,
  errorMessage: string
): Promise<void> {
  await db.offline_sales
    .where('localId')
    .equals(localId)
    .modify({
      syncStatus: 'ERROR',
      syncError:  errorMessage,
    });
}

/** Conta vendas pendentes — usado pelo badge de status */
export async function countPendingSales(): Promise<number> {
  return db.offline_sales
    .where('syncStatus')
    .anyOf(['PENDING', 'ERROR'])
    .count();
}

/** Atualiza o cache completo de produtos */
export async function updateProductsCache(
  products: CachedProduct[]
): Promise<void> {
  await db.transaction('rw', db.products_cache, async () => {
    await db.products_cache.clear();
    await db.products_cache.bulkPut(products);
  });
}

/** Retorna produtos do cache (para uso offline) */
export async function getCachedProducts(): Promise<CachedProduct[]> {
  return db.products_cache.toArray();
}
