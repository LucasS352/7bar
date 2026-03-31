import { create } from 'zustand';

export type Product = { id: string; name: string; priceSell: number; stock: number; barcode: string | null; shortCode: string | null; active?: boolean; };
export type CartItem = Product & { quantity: number; subtotal: number };

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  addItem: (product, quantity = 1) => {
    const { items } = get();
    const existing = items.find(i => i.id === product.id);
    let newItems;
    if (existing) {
      newItems = items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantity, subtotal: (i.quantity + quantity) * i.priceSell } : i);
    } else {
      newItems = [...items, { ...product, quantity, subtotal: quantity * product.priceSell }];
    }
    set({ items: newItems, total: newItems.reduce((acc, i) => acc + i.subtotal, 0) });
  },
  removeItem: (id) => {
    const newItems = get().items.filter(i => i.id !== id);
    set({ items: newItems, total: newItems.reduce((acc, i) => acc + i.subtotal, 0) });
  },
  updateQuantity: (id, quantity) => {
    if (quantity <= 0) return get().removeItem(id);
    const newItems = get().items.map(i => i.id === id ? { ...i, quantity, subtotal: quantity * i.priceSell } : i);
    set({ items: newItems, total: newItems.reduce((acc, i) => acc + i.subtotal, 0) });
  },
  clearCart: () => set({ items: [], total: 0 })
}));
