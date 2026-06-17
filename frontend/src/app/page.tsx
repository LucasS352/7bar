"use client";
import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/auth';
import { useCartStore, Product, CartItemModifier } from '@/store/cart';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Search, ShoppingCart, LogOut, PackageOpen, Minus, Plus, Trash2, LayoutDashboard, FileText, ArrowDownUp, X, Layers } from 'lucide-react';
import { PaymentModal } from '@/components/PaymentModal';
import { CloseRegisterModal } from '@/components/CloseRegisterModal';
import { CashMovementModal } from '@/components/CashMovementModal';
import { OperatorLoginModal } from '@/components/OperatorLoginModal';
import { OpenShiftModal } from '@/components/OpenShiftModal';
import { CompositeModifierModal } from '@/components/CompositeModifierModal';
import { ShiftProvider, useShift } from '@/contexts/ShiftContext';

function PosPageContent() {
  const navigate = useNavigate();
  const { token, user, logout } = useAuthStore();
  const { items, total, addItem, updateQuantity, removeItem } = useCartStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCloseRegisterOpen, setIsCloseRegisterOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [compositeProduct, setCompositeProduct] = useState<Product | null>(null);

  // Shift Management
  const { operator, cashRegister, isLoading: isShiftLoading, logoutOperator } = useShift();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    api.get('/products?limit=1000') // PDV carrega mais itens para busca local fluida
      .then(res => setProducts(res.data.data || []))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [token, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4' && items.length > 0) {
        e.preventDefault();
        setIsPaymentOpen(true);
      }
      if (e.key === 'Escape') {
        setIsPaymentOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items]);

  const handleLogout = () => {
    logoutOperator(); // Clear operator shift session
    logout(); // Clear main tenant session
    navigate('/login');
  };

  const handleClickProduct = (product: Product) => {
    if (product.isComposite && product.modifierGroups && product.modifierGroups.length > 0) {
      setCompositeProduct(product);
    } else {
      addItem(product);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim() !== '') {
      const match = products.find(p => p.shortCode?.toLowerCase() === search.toLowerCase().trim() || p.barcode === search.trim());
      if (match) {
        handleClickProduct(match);
        setSearch('');
      } else if (filtered.length === 1) {
        handleClickProduct(filtered[0]);
        setSearch('');
      }
    }
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return products.filter(p => p.active !== false);
    
    return products.filter(p => 
      p.active !== false && (
        p.name.toLowerCase().includes(s) || 
        p.barcode?.includes(s) || 
        p.shortCode?.toLowerCase().includes(s)
      )
    );
  }, [products, search]);

  if (!token) return null; // Wait for redirect

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* Esquerda: PDV e Produtos */}
      <div className="flex-1 flex flex-col p-4 md:p-6 md:pr-4 relative pb-24 md:pb-6">
        {/* Header Superior */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
              7bar POS
            </h1>
            <p className="text-emerald-400 font-medium text-sm flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Operador: {operator?.name || user?.name} ({user?.tenant})
              {cashRegister?.id && <span className="ml-2 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-400 uppercase tracking-widest hidden sm:inline-block">Caixa Aberto</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
            {cashRegister?.id ? (
              <>
                <button onClick={() => setIsMovementOpen(true)} className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-zinc-900 md:bg-transparent text-zinc-300 md:text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition font-semibold text-sm whitespace-nowrap border border-zinc-800 md:border-transparent flex-1 md:flex-none">
                  <ArrowDownUp size={18} /> Sangria / Reposição
                </button>
                <button onClick={() => setIsCloseRegisterOpen(true)} className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-zinc-900 md:bg-transparent text-zinc-300 md:text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition font-semibold text-sm whitespace-nowrap border border-zinc-800 md:border-transparent flex-1 md:flex-none">
                  <FileText size={18} /> Fechar Caixa
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { logoutOperator(); navigate('/dashboard'); }} className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-zinc-900 md:bg-transparent text-zinc-300 md:text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition font-semibold border border-zinc-800 md:border-transparent flex-1 md:flex-none">
                  <LayoutDashboard size={18} /> <span className="hidden sm:inline">Dashboard</span>
                </button>
                <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-zinc-900 md:bg-transparent text-zinc-300 md:text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition font-semibold border border-zinc-800 md:border-transparent flex-1 md:flex-none">
                  <LogOut size={18} /> <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Busca com Estilo Glass */}
        <div className="relative mb-4 md:mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={22} className="text-blue-500" />
          </div>
          <input 
            id="product-search-input"
            type="text" 
            placeholder="[F2] Bipe ou Digite o Cód Curto e aperte Enter..." 
            className="w-full py-3 md:py-4 pl-12 pr-4 text-base md:text-2xl font-bold bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl md:rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-zinc-500 shadow-inner tracking-tight"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            autoFocus
          />
        </div>

        {/* Grid de Produtos */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <PackageOpen size={48} className="opacity-50 animate-pulse" />
              <p className="text-lg">Carregando catálogo de produtos...</p>
            </div>
          ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <PackageOpen size={48} className="opacity-50" />
              <p className="text-lg text-center">A sua loja (Tenant) não possui produtos cadastrados!<br/> Tente recarregar a página!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 pb-12">
                              {filtered.map(product => (
                <div key={product.id} className="group relative bg-zinc-900 border border-zinc-800 p-3 md:p-4 rounded-2xl hover:border-blue-500 transition-all flex flex-col items-center justify-between min-h-[160px] overflow-hidden shadow-sm hover:shadow-md">
                  {/* Fundo gradiente leve no hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  
                  {/* Indicador de produto composto */}
                  {product.isComposite && (
                    <div className="absolute top-3 left-3 z-10">
                      <div className="bg-indigo-500/15 border border-indigo-500/30 rounded-full p-1" title="Produto Composto">
                        <Layers size={10} className="text-indigo-400" />
                      </div>
                    </div>
                  )}

                  {/* Área principal do botão */}
                  <button onClick={() => handleClickProduct(product)} className="w-full flex-1 flex flex-col items-center justify-center z-10 active:scale-95 transition-transform">
                    {product.shortCode && (
                       <span className="absolute top-3 right-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-extrabold text-[11px] px-2 py-0.5 rounded shadow-sm">
                         {product.shortCode}
                       </span>
                    )}
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-contain mb-3 opacity-90 group-hover:opacity-100 transition-opacity drop-shadow-sm" />
                    ) : (
                      <PackageOpen size={32} className="text-zinc-700 mb-3" />
                    )}
                    <span className="font-semibold text-[1.1rem] text-center leading-snug z-10 line-clamp-2 px-1 text-zinc-100">{product.name}</span>
                    <span className="text-blue-400 font-bold mt-2 text-xl z-10">R$ {Number(product.priceSell).toFixed(2)}</span>
                    <div className="text-xs text-zinc-500 mt-2 z-10 border border-zinc-700 px-2 py-0.5 rounded-full bg-zinc-950 flex items-center gap-1 font-medium">
                       {product.isComposite ? (
                         <span className="text-indigo-400">Composto</span>
                       ) : (
                         <>Estoque: {Number(product.stock).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</>
                       )}
                    </div>
                  </button>

                  {/* Multiplicadores — ocultar em compostos */}
                  {!product.isComposite && (
                    <div className="w-full flex justify-center gap-1 mt-3 z-20 md:opacity-0 md:group-hover:opacity-100 transition-all md:translate-y-2 md:group-hover:translate-y-0 opacity-100 translate-y-0 overflow-x-auto custom-scrollbar pb-1">
                      {[4, 6, 12, 16, 24].map(qt => (
                        <button 
                          key={qt}
                          onClick={(e) => { e.stopPropagation(); addItem(product, qt); }}
                          className="bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white font-bold text-[10px] sm:text-xs py-1.5 px-2 rounded-lg transition-colors active:scale-90 flex-shrink-0"
                          title={`Adicionar fardo de ${qt}`}
                        >
                          +{qt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MOBILE FAB (Floating Action Button) --- */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-500 active:scale-95 transition-all"
        >
          <ShoppingCart size={28} />
          {items.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-sm">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* --- CART COMPONENT (Desktop Sidebar OR Mobile Drawer) --- */}
      <div className={`
        ${isCartOpen ? 'fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none md:static md:inset-auto md:z-auto' : 'hidden md:flex md:w-[420px]'}
        transition-all duration-300
      `}>
        {/* Mobile Drawer Click-away Area */}
        {isCartOpen && (
          <div className="flex-1 md:hidden" onClick={() => setIsCartOpen(false)}></div>
        )}

        <div className={`
          w-full md:w-[420px] bg-zinc-900/95 backdrop-blur-3xl md:backdrop-blur-2xl border-l border-zinc-800 flex flex-col shadow-2xl relative
          ${isCartOpen ? 'h-[85vh] md:h-full rounded-t-3xl md:rounded-none animate-in slide-in-from-bottom-full md:animate-none' : 'h-full'}
        `}>
          {/* Mobile Handle */}
          <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-4 mb-2 md:hidden"></div>

          <div className="p-4 md:p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
              <ShoppingCart className="text-blue-500" /> Carrinho
            </h2>
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 text-xs px-3 py-1 rounded-full font-bold">{items.length} itens</span>
              <button className="md:hidden p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full" onClick={() => setIsCartOpen(false)}>
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Lista de Itens do Carrinho */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                <ShoppingCart size={40} className="mb-4 opacity-20" />
                <p>Adicione produtos para vender.</p>
              </div>
            ) : (
                            items.map(item => (
                <div key={item.cartKey} className="flex flex-col p-4 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm hover:border-zinc-700 transition-colors group">
                  <div className="flex gap-3 mb-3">
                    {item.imageUrl && (
                      <div className="w-12 h-12 flex-shrink-0 bg-white/5 rounded-lg flex items-center justify-center p-1 border border-white/5">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1 flex justify-between items-start">
                      <div className="flex-1 pr-2">
                        <div className="font-semibold text-zinc-200 line-clamp-2 leading-tight">{item.name}</div>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.modifiers.map((mod, idx) => (
                              <div key={idx} className="text-[11px] text-indigo-400 font-medium">
                                {mod.groupName}: <span className="text-zinc-300">{mod.optionName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-lg text-emerald-400 whitespace-nowrap pl-2">
                        R$ {item.subtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
                    <button onClick={() => updateQuantity(item.cartKey, item.quantity - 1)} className="p-3 md:p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition group-hover:text-blue-400">
                      <Minus size={18} />
                    </button>
                    <span className="font-bold w-12 text-center text-lg md:text-base">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartKey, item.quantity + 1)} className="p-3 md:p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition group-hover:text-blue-400">
                      <Plus size={18} />
                    </button>
                    <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                    <button onClick={() => removeItem(item.cartKey)} className="p-3 md:p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition w-full flex justify-center">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé de Checkout */}
          <div className="p-4 md:p-6 bg-zinc-950 border-t border-zinc-800 pb-safe md:pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
            <div className="flex justify-between items-end mb-4 md:mb-6">
              <span className="text-zinc-400 font-medium text-lg">Total</span>
              <span className="text-3xl md:text-4xl font-black text-white">R$ {total.toFixed(2)}</span>
            </div>
            
            <button 
              disabled={items.length === 0}
              onClick={() => { setIsCartOpen(false); setIsPaymentOpen(true); }}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-4 md:py-5 px-6 rounded-2xl text-xl transition-all shadow-lg active:scale-95 flex justify-between items-center group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="z-10">[F4] Cobrar</span>
              <span className="z-10 bg-black/20 p-2 rounded-xl text-sm italic">Finalizar</span>
            </button>
          </div>
        </div>
      </div>

            <CompositeModifierModal
        product={compositeProduct as any}
        isOpen={!!compositeProduct}
        onClose={() => setCompositeProduct(null)}
        onConfirm={(product, selectedModifiers) => {
          const modifiers: CartItemModifier[] = selectedModifiers.map(({ group, option }) => ({
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            optionName: option.name,
            componentProductId: option.componentProductId,
            quantity: Number(option.quantity || 1),
            priceAdjustment: Number(option.priceAdjustment || 0),
          }));
          addItem(product as any, 1, modifiers);
          setCompositeProduct(null);
        }}
      />

      {/* ─── MODAIS DE GESTÃO DE OPERADOR E TURNO ─── */}
      {!isShiftLoading && !operator && (
        <OperatorLoginModal onSuccess={() => {}} />
      )}
      
      {!isShiftLoading && operator && !cashRegister && (
        <OpenShiftModal onSuccess={() => {}} />
      )}

      {/* ─── MODAIS SECUNDÁRES ─── */}
      <CloseRegisterModal 
        isOpen={isCloseRegisterOpen} 
        registerId={cashRegister?.id} 
        onClose={async (closed) => {
          setIsCloseRegisterOpen(false);
          if (closed) {
            logoutOperator();
          }
        }} 
      />
      <PaymentModal isOpen={isPaymentOpen} onClose={() => {
        setIsPaymentOpen(false);
        setTimeout(() => {
          const input = document.getElementById('product-search-input');
          if (input) {
            input.focus();
            // Fallback duplo caso a renderização seja lenta
            setTimeout(() => input.focus(), 300);
          }
        }, 100);
      }} isOnline={true} />
      {cashRegister && (
        <CashMovementModal 
          isOpen={isMovementOpen}
          registerId={cashRegister.id}
          onClose={() => setIsMovementOpen(false)}
        />
      )}
    </div>
  );
}

export default function PosPage() {
  return (
    <ShiftProvider>
      <PosPageContent />
    </ShiftProvider>
  );
}
