export interface PurchaseDraftItem {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
}

export interface PurchaseDraft {
  days: number;
  notes: string;
  items: PurchaseDraftItem[];
}

export const emptyPurchaseDraft = (): PurchaseDraft => ({ days: 30, notes: '', items: [] });

export function purchaseDraftKey(tenantId?: string | null, userId?: string | null): string | null {
  if (!tenantId || !userId) return null;
  return `7bar-purchase-plan-v1:${encodeURIComponent(tenantId)}:${encodeURIComponent(userId)}`;
}

export function parsePurchaseDraft(raw: string | null): PurchaseDraft {
  if (!raw) return emptyPurchaseDraft();
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || !Array.isArray(value.items)) return emptyPurchaseDraft();
    const days = typeof value.days === 'number' && Number.isInteger(value.days) && value.days >= 1 && value.days <= 90
      ? value.days : 30;
    const notes = typeof value.notes === 'string' ? value.notes.slice(0, 500) : '';
    const seen = new Set<string>();
    const items: PurchaseDraftItem[] = [];
    for (const row of value.items.slice(0, 200)) {
      if (!row || typeof row !== 'object') continue;
      const item = row as Record<string, unknown>;
      if (typeof item.productId !== 'string' || !item.productId ||
          typeof item.name !== 'string' || !item.name ||
          typeof item.unit !== 'string' || !item.unit ||
          typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) ||
          item.quantity < 0.001 || item.quantity > 1_000_000 || seen.has(item.productId)) continue;
      seen.add(item.productId);
      items.push({
        productId: item.productId.slice(0, 100),
        name: item.name.slice(0, 160),
        unit: item.unit.slice(0, 20),
        quantity: Math.round(item.quantity * 1000) / 1000,
      });
    }
    return { days, notes, items };
  } catch {
    return emptyPurchaseDraft();
  }
}

export function suggestedPurchase(
  sold30: number,
  days: number,
  inventory: { stock: number; minimum: number; pending: number } | null,
  includeStock: boolean,
): number {
  const demand = Math.ceil(Math.max(0, sold30) * days / 30);
  if (!includeStock || !inventory) return demand;
  return Math.max(0, Math.ceil(demand + inventory.minimum - Math.max(0, inventory.stock) - inventory.pending));
}

export function buildPurchaseMessage(draft: PurchaseDraft): string {
  const clean = (value: string) => value.replace(/[\r\n\t]+/g, ' ').trim();
  const lines = [
    `*Rascunho de compra · ${draft.days} dias*`,
    'Montado com apoio da previsão de vendas do PDV TelTech.',
    '',
    ...draft.items.map((item, index) => `${index + 1}. ${clean(item.name)} — ${item.quantity.toLocaleString('pt-BR')} ${clean(item.unit)}`),
  ];
  if (draft.notes.trim()) lines.push('', `Observações: ${clean(draft.notes)}`);
  lines.push('', 'Rascunho para conferência. Nenhum pedido foi enviado ao fornecedor.');
  return lines.join('\n');
}
