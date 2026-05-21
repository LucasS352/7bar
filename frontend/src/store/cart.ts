import { create } from 'zustand';

export type Product = { 
  id: string; name: string; priceSell: number; stock: number; 
  salesCount?: number; barcode: string | null; shortCode: string | null; 
  active?: boolean; imageUrl?: string | null; 
  isComposite?: boolean; modifierGroups?: any[];
};

export type CartItemModifier = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  componentProductId: string;
  quantity: number;
  priceAdjustment: number;
};

export type CartItem = Product & { 
  quantity: number; 
  subtotal: number; 
  cartKey: string;
  modifiers?: CartItemModifier[];
  effectivePriceSell: number;
};

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, modifiers?: CartItemModifier[]) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

function buildCartKey(productId: string, modifiers?: CartItemModifier[]): string {
  if (!modifiers || modifiers.length === 0) return productId;
  const modKey = modifiers
    .sort((a, b) => a.groupId.localeCompare(b.groupId))
    .map(m => `${m.groupId}:${m.optionId}`)
    .join('|');
  return `${productId}__${modKey}`;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  addItem: (product, quantity = 1, modifiers) => {
    const { items } = get();
    const priceAdjustment = (modifiers || []).reduce((acc, m) => acc + Number(m.priceAdjustment || 0), 0);
    const effectivePriceSell = Number(product.priceSell) + priceAdjustment;
    const cartKey = buildCartKey(product.id, modifiers);
    const existing = items.find(i => i.cartKey === cartKey);

    let newItems;
    if (existing) {
      newItems = items.map(i => i.cartKey === cartKey 
        ? { ...i, quantity: i.quantity + quantity, subtotal: (i.quantity + quantity) * i.effectivePriceSell } 
        : i
      );
    } else {
      newItems = [...items, { 
        ...product, quantity, 
        subtotal: quantity * effectivePriceSell, 
        cartKey, 
        modifiers,
        effectivePriceSell
      }];
    }
    set({ items: newItems, total: newItems.reduce((acc, i) => acc + i.subtotal, 0) });
  },
  removeItem: (cartKey) => {
    const newItems = get().items.filter(i => i.cartKey !== cartKey);
    set({ items: newItems, total: newItems.reduce((acc, i) => acc + i.subtotal, 0) });
  },
  updateQuantity: (cartKey, quantity) => {
    if (quantity <= 0) return get().removeItem(cartKey);
    const newItems = get().items.map(i => i.cartKey === cartKey ? { ...i, quantity, subtotal: quantity * i.effectivePriceSell } : i);
    set({ items: newItems, total: newItems.reduce((acc, i) => acc + i.subtotal, 0) });
  },
  clearCart: () => set({ items: [], total: 0 })
}));
