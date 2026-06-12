import { useState, useEffect, useDeferredValue, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useCartStore, type Product, type CartItemModifier } from '@/store/cart';
import { api } from '@/lib/api';
import { updateProductsCache, getCachedProducts } from '@/lib/db';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { PaymentModal } from '@/components/PaymentModal';
import { OperatorLoginModal } from '@/components/OperatorLoginModal';
import { OpenShiftModal } from '@/components/OpenShiftModal';
import { CloseRegisterModal } from '@/components/CloseRegisterModal';
import { CashMovementModal } from '@/components/CashMovementModal';
import { CompositeModifierModal } from '@/components/CompositeModifierModal';
import { ShiftProvider, useShift } from '@/contexts/ShiftContext';
import {
  Search, ShoppingCart, X, LogOut, PackageOpen, Minus, Plus, Trash2,
  LayoutDashboard, FileText, ArrowDownUp, Database, Layers
} from 'lucide-react';
import { getFullUrl } from '@/lib/getFullUrl';

function PosPageContent() {
  const navigate = useNavigate();
  const { token, user, logout } = useAuthStore();
  const { items, total, addItem, updateQuantity, removeItem } = useCartStore();

  const syncState = useOfflineSync();

  const [products,           setProducts]           = useState<Product[]>([]);
  const [search,             setSearch]             = useState('');
  const [isPaymentOpen,      setIsPaymentOpen]      = useState(false);
  const [isCloseRegisterOpen,setIsCloseRegisterOpen]= useState(false);
  const [isMobileCartOpen,   setIsMobileCartOpen]   = useState(false);
  const [isMovementOpen,     setIsMovementOpen]     = useState(false);
  const [isLoading,          setIsLoading]          = useState(true);
  const [isOfflineCatalog,   setIsOfflineCatalog]   = useState(false);
  const [tenantConfig,       setTenantConfig]       = useState<any>(null);
  const [compositeProduct,   setCompositeProduct]   = useState<Product | null>(null);
  const { operator, cashRegister, isLoading: isShiftLoading, logoutOperator, refreshShift } = useShift();

  const handleClickProduct = (product: Product) => {
    // Busca o produto com os modifierGroups completos do array de products em memória
    const fullProduct = products.find(p => p.id === product.id) || product;
    if (fullProduct.isComposite && fullProduct.modifierGroups && fullProduct.modifierGroups.length > 0) {
      setCompositeProduct(fullProduct);
    } else {
      addItem(product);
    }
  };

  useEffect(() => {
    if (token) {
      api.get(`/tenants/me?_t=${Date.now()}`).then(res => setTenantConfig(res.data)).catch(console.error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }



    setIsLoading(true);

    const PRIORITY_KEYWORDS = ['cerveja', 'heineken', 'brahma', 'skol', 'amstel', 'coca-cola', 'refrigerante', 'red bull', 'energético', 'vodka', 'gin', 'água'];
    const getScore = (name: string) => {
      const lower = name.toLowerCase();
      for (let i = 0; i < PRIORITY_KEYWORDS.length; i++) {
        if (lower.includes(PRIORITY_KEYWORDS[i])) return PRIORITY_KEYWORDS.length - i;
      }
      return 0;
    };

    const sortProducts = (list: any[]) => {
      return [...list].sort((a, b) => {
        // 1. Prioriza pelo número REAL de vendas (maior para menor)
        const aSales = Number(a.salesCount || 0);
        const bSales = Number(b.salesCount || 0);
        if (bSales !== aSales) {
          return bSales - aSales;
        }
        // 2. Desempate: Se as vendas forem iguais (ex: tudo zerado), 
        // prioriza pelas palavras chaves (Cerveja, refri, etc)
        return getScore(b.name) - getScore(a.name);
      });
    };

    if (syncState.isOnline) {
      // Online: busca da API e atualiza cache local
      api.get('/products?limit=2000')
        .then(async res => {
          const data = (res.data as any).data || [];
          const sorted = sortProducts(data);
          setProducts(sorted);
          // Persiste no IndexedDB para uso offline futuro
          await updateProductsCache(sorted.map((p: any) => ({
            id:         p.id,
            name:       p.name,
            shortCode:  p.shortCode,
            barcode:    p.barcode,
            unit:       'UN',
            priceSell:  Number(p.priceSell),
            stock:      Math.round(Number(p.stock)),
            salesCount: Number(p.salesCount || 0),
            active:     p.active !== false,
            ncm:        null, cest: null, origem: 0,
            cfop:       '5102', csosn: null, cstIcms: null,
            aliqIcms:   0, cstPis: '99', aliqPis: 0,
            cstCofins:  '99', aliqCofins: 0,
            cachedAt:   Date.now(),
            imageUrl:   p.imageUrl,
          })));
          setIsOfflineCatalog(false);
        })
        .catch(async () => {
          // Falhou mesmo online — tenta o cache
          const cached = await getCachedProducts();
          setProducts(sortProducts(cached as unknown as Product[]));
          setIsOfflineCatalog(true);
        })
        .finally(() => setIsLoading(false));
    } else {
      // Offline: carrega catálogo do IndexedDB
      getCachedProducts()
        .then(cached => {
          setProducts(sortProducts(cached as unknown as Product[]));
          setIsOfflineCatalog(true);
        })
        .finally(() => setIsLoading(false));
    }
  }, [token, navigate, syncState.isOnline]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4' && items.length > 0) { e.preventDefault(); setIsPaymentOpen(true); }
      if (e.key === 'Escape') setIsPaymentOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items]);

  const handleLogout = () => {
    logoutOperator();
    logout();
    navigate('/login');
  };

  const deferredSearch = useDeferredValue(search);
  
  const displayedProducts = useMemo(() => {
    const normalizeStr = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const searchTerms = normalizeStr(deferredSearch).split(' ').filter(t => t.trim() !== '');

    const filtered = products.filter(p => {
      if (p.active === false) return false;
      if (searchTerms.length === 0) return true;
      
      const searchString = normalizeStr(`${p.name} ${p.barcode || ''} ${p.shortCode || ''}`);
      return searchTerms.every(term => searchString.includes(term));
    });

    // Limita a exibição na tela para não travar o navegador com milhares de cards
    return filtered.slice(0, 50);
  }, [products, deferredSearch]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim() !== '') {
      const match = products.find(p =>
        p.shortCode?.toLowerCase() === search.toLowerCase().trim() || p.barcode === search.trim()
      );
      if (match) { handleClickProduct(match); setSearch(''); }
      else if (displayedProducts.length === 1) { handleClickProduct(displayedProducts[0]); setSearch(''); }
    }
  };

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  if (!token) return null;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-zinc-950 text-white font-sans overflow-hidden">
      {/* Esquerda */}
      <div className="flex-1 flex flex-col p-3 md:p-6 md:pr-4 pb-[80px] md:pb-6 relative h-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 gap-3 shrink-0">
          <div className="flex justify-between items-center w-full md:w-auto gap-4 min-h-[48px] md:min-h-[64px]">
            <div className="flex items-center gap-4">
              {tenantConfig === null ? (
                 <div className="h-10 md:h-12 w-10 md:w-12 bg-zinc-800/50 animate-pulse rounded-xl shrink-0"></div>
              ) : tenantConfig?.logoUrl ? (
                <div className="bg-white p-1.5 md:p-2 rounded-xl flex items-center justify-center shrink-0">
                  <img src={getFullUrl(tenantConfig.logoUrl)} alt="Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain drop-shadow-md" />
                </div>
              ) : (
                <div className="bg-white p-1.5 md:p-2 rounded-xl flex items-center justify-center shrink-0">
                  <h1 className="text-xl md:text-2xl font-black text-zinc-900 truncate max-w-[100px]">
                    {tenantConfig?.nomeFantasia?.substring(0, 2) || tenantConfig?.razaoSocial?.substring(0, 2) || '7B'}
                  </h1>
                </div>
              )}
              
              <div className="hidden md:flex items-center gap-3">
                 <p className="text-emerald-400 font-medium text-xs md:text-sm flex items-center gap-2 truncate max-w-[200px] md:max-w-none">
                   <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                   <span className="truncate">Operador: {operator?.name || user?.name} {user?.tenant ? `(${user.tenant})` : ''}</span>
                 </p>
                 {cashRegister?.id && (
                   <span className="text-[10px] md:text-xs bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 text-emerald-400 uppercase tracking-widest font-bold">
                     CAIXA ABERTO
                   </span>
                 )}
              </div>
            </div>
            
            {/* Mobile Actions and Mobile Operator Info */}
            <div className="flex flex-col items-end gap-2 md:hidden">
              <div className="flex items-center gap-1.5">
                  <ConnectionStatus syncState={syncState} />
                  {cashRegister?.id && (
                    <button onClick={() => setIsMovementOpen(true)} className="p-2 text-zinc-400 hover:text-emerald-400 bg-zinc-900 rounded-xl transition">
                      <ArrowDownUp size={18} />
                    </button>
                  )}
                  <button onClick={() => setIsCloseRegisterOpen(true)} className="p-2 text-zinc-400 hover:text-amber-400 bg-zinc-900 rounded-xl transition">
                    <FileText size={18} />
                  </button>
                  <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-400 bg-zinc-900 rounded-xl transition">
                    <LogOut size={18} />
                  </button>
              </div>
              <div className="flex items-center gap-2">
                 <p className="text-emerald-400 font-medium text-xs flex items-center gap-1.5 truncate max-w-[150px]">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                   <span className="truncate">Op: {operator?.name || user?.name}</span>
                 </p>
                 {cashRegister?.id && (
                   <span className="text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-400 uppercase tracking-widest font-bold">
                     ABERTO
                   </span>
                 )}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {/* Badge de conexão */}
            <ConnectionStatus syncState={syncState} />

            {/* Badge de catálogo offline */}
            {isOfflineCatalog && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium">
                <Database size={12} />
                <span>Catálogo em cache</span>
              </div>
            )}

            {cashRegister?.id && (
              <button onClick={() => setIsMovementOpen(true)} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition font-semibold text-sm whitespace-nowrap">
                <ArrowDownUp size={18} /> Sangria / Reposição
              </button>
            )}
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition font-semibold">
                <LayoutDashboard size={18} /> Dashboard
              </button>
            )}
            <button onClick={() => setIsCloseRegisterOpen(true)} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition font-semibold text-sm whitespace-nowrap">
              <FileText size={18} /> Relatório de Caixa
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition font-semibold">
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative mb-3 md:mb-6 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-blue-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, código ou EAN..."
            className="w-full py-3 md:py-4 pl-10 md:pl-12 pr-4 text-lg md:text-2xl font-bold bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl md:rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-zinc-500 shadow-inner tracking-tight"
            value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKeyPress}
          />
        </div>

        {/* Grid de Produtos */}
        <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <PackageOpen size={48} className="opacity-50 animate-pulse" />
              <p className="text-lg">Carregando catálogo...</p>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <PackageOpen size={48} className="opacity-50" />
              <p className="text-lg text-center">
                {isOfflineCatalog ? 'Sem produtos em cache. Conecte-se à internet para carregar o catálogo.' : 'Nenhum produto encontrado. Tente recarregar!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 pb-24 md:pb-12">
              {displayedProducts.map(product => (
                <div key={product.id} className="group relative bg-zinc-900 border border-zinc-800 p-3 rounded-2xl hover:border-blue-500 transition-all flex flex-col items-center justify-between min-h-[160px] overflow-hidden shadow-sm hover:shadow-md">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <button onClick={() => handleClickProduct(product)} className="w-full flex-1 flex flex-col items-center justify-start z-10 active:scale-95 transition-transform">
                    {product.isComposite && (
                      <span className="absolute top-3 left-3 bg-indigo-600 border border-indigo-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded shadow-sm z-20 flex items-center gap-1">
                        <Layers size={10} /> Combo
                      </span>
                    )}

                    {product.shortCode && (
                      <span className="absolute top-3 right-3 bg-zinc-900/80 backdrop-blur-md border border-blue-500/30 text-blue-400 font-extrabold text-[11px] px-2 py-0.5 rounded shadow-sm z-20">
                        {product.shortCode}
                      </span>
                    )}
                    
                    {product.imageUrl && (
                      <div className="w-full h-32 mb-3 bg-white rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-inner">
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover:scale-105" loading="lazy" />
                      </div>
                    )}
                    
                    <span className="font-semibold text-[1.05rem] text-center leading-snug z-10 line-clamp-2 px-1 text-zinc-100 mt-auto">{product.name}</span>
                    <span className="text-blue-400 font-bold mt-2 text-xl z-10">R$ {Number(product.priceSell).toFixed(2)}</span>
                    <div className="text-xs text-zinc-500 mt-2 z-10 border border-zinc-700 px-2 py-0.5 rounded-full bg-zinc-950 flex items-center gap-1 font-medium">
                      Estoque: {Math.round(Number(product.stock))}
                    </div>
                  </button>
                  {!product.isComposite && (
                    <div className="w-full flex justify-center gap-1 mt-3 z-20 sm:opacity-0 group-hover:opacity-100 transition-all sm:translate-y-2 group-hover:translate-y-0">
                      {[4, 6, 12, 16, 24].map(qt => (
                        <button key={qt} onClick={(e) => { e.stopPropagation(); addItem(product, qt); }}
                          className="bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white font-bold text-[10px] sm:text-xs py-1.5 px-2 rounded-lg transition-colors active:scale-90">
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

      {/* Carrinho (direita) */}
      <div className={`fixed inset-0 z-50 flex flex-col bg-zinc-950 transition-transform duration-300 md:relative md:z-10 md:w-[420px] md:bg-zinc-900/90 md:backdrop-blur-2xl md:border-l md:border-zinc-800 md:shadow-2xl ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
        <div className="p-4 md:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 md:bg-transparent">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
            <ShoppingCart className="text-blue-500" /> Carrinho
          </h2>
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-xs px-3 py-1 rounded-full font-bold">{totalItemsCount} itens</span>
            <button onClick={() => setIsMobileCartOpen(false)} className="md:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {totalItemsCount === 0 ? (
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
                  <button onClick={() => updateQuantity(item.cartKey, item.quantity - 1)} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"><Minus size={18} /></button>
                  <span className="font-bold w-10 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.cartKey, item.quantity + 1)} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"><Plus size={18} /></button>
                  <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                  <button onClick={() => removeItem(item.cartKey)} className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition w-full flex justify-center"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-zinc-950 border-t border-zinc-800">
          <div className="flex justify-between items-end mb-6">
            <span className="text-zinc-400 font-medium text-lg">Total</span>
            <span className="text-4xl font-black text-white">R$ {total.toFixed(2)}</span>
          </div>
          <button
            disabled={totalItemsCount === 0}
            onClick={() => setIsPaymentOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-4 md:py-5 px-6 rounded-xl md:rounded-2xl text-xl transition-all shadow-lg active:scale-95 flex justify-between items-center group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <span className="z-10"><span className="hidden md:inline">[F4]</span> Cobrar</span>
            <span className="z-10 bg-black/20 p-2 rounded-xl text-sm italic">Finalizar</span>
          </button>
        </div>
      </div>

      {/* Botão Flutuante (FAB) Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 z-40 pb-safe">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl flex justify-between items-center shadow-lg active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0 mr-3 text-left">
            <ShoppingCart size={20} className="shrink-0" />
            {items.length > 0 ? (
              <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs font-bold truncate block w-full">
                {items.map(item => `${item.product?.shortCode || (item.product?.name || 'Item').split(' ')[0]}(${item.quantity})`).join(' ')}
              </span>
            ) : (
              <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs font-bold">0</span>
            )}
          </div>
          <span className="text-lg tracking-tight shrink-0">R$ {total.toFixed(2)}</span>
        </button>
      </div>

      {/* Modais de Operador e Turno */}
      {!isShiftLoading && !operator && (
        <OperatorLoginModal onSuccess={() => {}} />
      )}
      
      {!isShiftLoading && operator && !cashRegister && (
        <OpenShiftModal onSuccess={() => {}} />
      )}

      {/* Modais Secundários */}
      {isCloseRegisterOpen && (
        <CloseRegisterModal
          isOpen={isCloseRegisterOpen}
          registerId={cashRegister?.id}
          onClose={async (closed) => { 
            setIsCloseRegisterOpen(false); 
            if (closed) {
              await refreshShift();
              logoutOperator();
            }
          }}
        />
      )}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        isOnline={syncState.isOnline}
        onPendingCountChange={syncState.syncNow}
        tenantConfig={tenantConfig}
      />
      {cashRegister?.id && (
        <CashMovementModal
          isOpen={isMovementOpen}
          registerId={cashRegister.id}
          onClose={() => setIsMovementOpen(false)}
        />
      )}

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
    </div>
  );
}

export function PosPage() {
  return (
    <ShiftProvider>
      <PosPageContent />
    </ShiftProvider>
  );
}
