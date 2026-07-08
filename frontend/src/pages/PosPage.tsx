import { useState, useEffect, useDeferredValue, useMemo, useRef, useCallback, type TouchEvent as ReactTouchEvent } from 'react';
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
  const [lastTappedId,       setLastTappedId]       = useState<string | null>(null);
  const [badgeBounce,        setBadgeBounce]        = useState(false);

  // Bottom sheet drag state
  const [sheetExpanded,      setSheetExpanded]      = useState(false);
  const touchStartY = useRef<number>(0);
  const touchDeltaY  = useRef<number>(0);
  const isDragging   = useRef<boolean>(false);
  const [isMovementOpen,     setIsMovementOpen]     = useState(false);
  const [isLoading,          setIsLoading]          = useState(true);
  const [isOfflineCatalog,   setOfflineCatalog]   = useState(false);
  const [forceDesktop, setForceDesktop] = useState(() => localStorage.getItem('7bar_forceDesktop') === 'true');
  const [tenantConfig,       setTenantConfig]       = useState<any>(null);
  const [compositeProduct,   setCompositeProduct]   = useState<Product | null>(null);
  const [focusedProductIdx,  setFocusedProductIdx]  = useState<number>(-1);
  const [promptQuantity,      setPromptQuantity]      = useState(() => localStorage.getItem('7bar_promptQuantity') === 'true');
  const [productToSetQuantity,setProductToSetQuantity]= useState<Product | null>(null);
  const [tempQuantity,        setTempQuantity]        = useState<number>(1);
  const productRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { operator, cashRegister, isLoading: isShiftLoading, logoutOperator, refreshShift } = useShift();

  useEffect(() => {
    localStorage.setItem('7bar_promptQuantity', String(promptQuantity));
  }, [promptQuantity]);

  useEffect(() => {
    localStorage.setItem('7bar_forceDesktop', String(forceDesktop));
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      if (forceDesktop) {
        meta.setAttribute('content', 'width=1200, maximum-scale=1.0');
      } else {
        meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover');
      }
    }
  }, [forceDesktop]);

  // --- Bottom sheet touch handlers ---
  const handleSheetTouchStart = (e: ReactTouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
    isDragging.current = true;
  };
  const handleSheetTouchMove = (e: ReactTouchEvent) => {
    if (!isDragging.current) return;
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
  };
  const handleSheetTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (touchDeltaY.current < -50) {
      setSheetExpanded(true);
    } else if (touchDeltaY.current > 50) {
      setSheetExpanded(false);
    }
    touchDeltaY.current = 0;
  };

  // --- Micro-animation helper ---
  const triggerTapAnimation = (productId: string) => {
    setLastTappedId(productId);
    setBadgeBounce(true);
    setTimeout(() => setLastTappedId(null), 200);
    setTimeout(() => setBadgeBounce(false), 300);
  };

  const handleClickProduct = (product: Product) => {
    // Busca o produto com os modifierGroups completos do array de products em memória
    const fullProduct = products.find(p => p.id === product.id) || product;
    setSearch('');
    triggerTapAnimation(product.id);
    if (fullProduct.isComposite && fullProduct.modifierGroups && fullProduct.modifierGroups.length > 0) {
      setCompositeProduct(fullProduct);
    } else if (promptQuantity) {
      setProductToSetQuantity(fullProduct);
      setTempQuantity(1);
    } else {
      addItem(fullProduct);
      setTimeout(() => {
        if (!('ontouchstart' in window)) {
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }
      }, 10);
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
      if ((e.key === 'F12' || e.key === '*') && items.length > 0) { e.preventDefault(); setIsPaymentOpen(true); }
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
    // Tab ou ArrowDown move o foco para o primeiro card de produto
    if ((e.key === 'Tab' || e.key === 'ArrowDown') && displayedProducts.length > 0) {
      e.preventDefault();
      setFocusedProductIdx(0);
      setTimeout(() => productRefs.current[0]?.focus(), 0);
    }
  };

  const handleProductGridKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    const cols = window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2;
    let next = index;
    if (e.key === 'ArrowRight') { e.preventDefault(); next = Math.min(index + 1, displayedProducts.length - 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); next = Math.max(index - 1, 0); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); next = Math.min(index + cols, displayedProducts.length - 1); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index < cols) {
        // Volta para a barra de busca
        setFocusedProductIdx(-1);
        (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus();
        return;
      }
      next = Math.max(index - cols, 0);
    }
    else if (e.key === 'Enter') {
      e.preventDefault();
      handleClickProduct(displayedProducts[index]);
      return;
    }
    else if (e.key === 'Escape') {
      setFocusedProductIdx(-1);
      (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus();
      return;
    }
    if (next !== index) {
      setFocusedProductIdx(next);
      setTimeout(() => productRefs.current[next]?.focus(), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedProducts]);

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  if (!token) return null;

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-zinc-950 text-white font-sans overflow-hidden">
      {/* Esquerda */}
      <div className="flex-1 flex flex-col p-3 lg:p-6 lg:pr-4 pb-[80px] lg:pb-6 relative h-full min-w-0">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:justify-between lg:items-center mb-4 lg:mb-6 gap-3 shrink-0">
          <div className="flex justify-between items-center w-full lg:w-auto gap-4 min-h-[48px] lg:min-h-[64px]">
            <div className="flex items-center gap-4">
              {tenantConfig === null ? (
                 <div className="h-10 lg:h-12 w-10 lg:w-12 bg-zinc-800/50 animate-pulse rounded-xl shrink-0"></div>
              ) : tenantConfig?.logoUrl ? (
                <button onClick={() => navigate('/dashboard')} className="flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform focus:outline-none" title="Voltar ao Dashboard">
                  <img src={getFullUrl(tenantConfig.logoUrl)} alt="Logo" className="h-10 w-10 lg:h-12 lg:w-12 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" />
                </button>
              ) : (
                <button onClick={() => navigate('/dashboard')} className="bg-zinc-800 border border-zinc-700 p-1.5 lg:p-2 rounded-xl flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform focus:outline-none" title="Voltar ao Dashboard">
                  <h1 className="text-xl lg:text-2xl font-black text-white truncate max-w-[100px]">
                    {tenantConfig?.nomeFantasia?.substring(0, 2) || tenantConfig?.razaoSocial?.substring(0, 2) || '7B'}
                  </h1>
                </button>
              )}
              
              <div className="hidden lg:flex items-center gap-3">
                 <p className="text-emerald-400 font-medium text-xs lg:text-sm flex items-center gap-2 truncate max-w-[200px] lg:max-w-none">
                   <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                   <span className="truncate">Operador: {operator?.name || user?.name} {user?.tenant ? `(${user.tenant})` : ''}</span>
                 </p>
                 {cashRegister?.id && (
                   <span className="text-[10px] lg:text-xs bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 text-emerald-400 uppercase tracking-widest font-bold">
                     CAIXA ABERTO
                   </span>
                 )}
              </div>
            </div>
                {/* Mobile Actions - condensed single row */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 shadow-inner">
                <p className="text-emerald-400 font-medium text-[10px] flex items-center gap-1.5 truncate max-w-[80px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                  <span className="truncate">{operator?.name || user?.name}</span>
                </p>
                <div className="w-px h-3 bg-zinc-700 mx-2" />
                <div className="scale-90 origin-left -ml-1">
                  <ConnectionStatus syncState={syncState} />
                </div>
              </div>
              
              {cashRegister?.id && (
                <button onClick={() => setIsMovementOpen(true)} className="p-2 text-zinc-400 hover:text-emerald-400 bg-zinc-900 rounded-xl transition shrink-0">
                  <ArrowDownUp size={18} />
                </button>
              )}
              <button onClick={() => setIsCloseRegisterOpen(true)} className="p-2 text-zinc-400 hover:text-amber-400 bg-zinc-900 rounded-xl transition shrink-0">
                <FileText size={18} />
              </button>
              <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-400 bg-zinc-900 rounded-xl transition shrink-0">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="hidden lg:flex lg:flex-wrap items-center gap-2">
            {/* Badge de conexão */}
            <ConnectionStatus syncState={syncState} />

            {/* Checkbox para selecionar quantidade */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800/50 text-zinc-400 hover:text-white cursor-pointer transition select-none text-sm font-semibold">
              <input type="checkbox" checked={promptQuantity} onChange={e => setPromptQuantity(e.target.checked)} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-950" />
              Selecionar Unidade
            </label>

            {/* Toggle Modo PC */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800/50 text-zinc-400 hover:text-white cursor-pointer transition select-none text-sm font-semibold">
              <input type="checkbox" checked={forceDesktop} onChange={e => setForceDesktop(e.target.checked)} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-950" />
              Modo PC (Tablet)
            </label>

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

        {/* Busca + toggle Unidade (mobile) */}
        <div className="relative mb-3 lg:mb-6 shrink-0 flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 lg:pl-4 flex items-center pointer-events-none">
              <Search size={20} className="text-blue-500" />
            </div>
            <input
              id="product-search-input"
              type="text"
              placeholder="Buscar por nome, código ou EAN..."
              className="w-full py-3 lg:py-4 pl-10 lg:pl-12 pr-4 text-lg lg:text-2xl font-bold bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl lg:rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-zinc-500 shadow-inner tracking-tight"
              value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKeyPress}
            />
          </div>
          {/* Compact Unidade toggle — mobile only */}
          <label className="lg:hidden flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-3 rounded-xl cursor-pointer select-none shrink-0 transition hover:border-zinc-700">
            <input type="checkbox" checked={promptQuantity} onChange={e => setPromptQuantity(e.target.checked)} className="w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-blue-500" />
            Qtd
          </label>
          {/* Toggle Modo PC mobile */}
          <label className="lg:hidden flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-3 rounded-xl cursor-pointer select-none shrink-0 transition hover:border-zinc-700">
            <input type="checkbox" checked={forceDesktop} onChange={e => setForceDesktop(e.target.checked)} className="w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-blue-500" />
            PC
          </label>
        </div>

        {/* Grid de Produtos */}
        <div className="flex-1 overflow-y-auto pr-1 lg:pr-2 custom-scrollbar">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 pb-[200px] lg:pb-12">
              {displayedProducts.map((product, idx) => (
                <div key={product.id} className={`group relative bg-zinc-900 border-2 p-3 rounded-2xl hover:border-blue-500 transition-all flex flex-col items-center justify-between min-h-[120px] lg:min-h-[160px] overflow-hidden shadow-sm hover:shadow-md ${focusedProductIdx === idx ? 'border-blue-400 ring-2 ring-blue-400/30' : 'border-zinc-800'} ${lastTappedId === product.id ? 'card-tap' : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <button
                    ref={el => { productRefs.current[idx] = el; }}
                    onClick={() => handleClickProduct(product)}
                    onKeyDown={e => handleProductGridKeyDown(e, idx)}
                    onFocus={() => setFocusedProductIdx(idx)}
                    tabIndex={focusedProductIdx === idx || (focusedProductIdx === -1 && idx === 0) ? 0 : -1}
                    className="w-full flex-1 flex flex-col items-center justify-start z-10 active:scale-95 transition-transform focus:outline-none">
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
                      <div className="w-full h-20 lg:h-32 mb-3 bg-white rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-inner">
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
                    <div className="w-full hidden lg:flex justify-center gap-1 mt-3 z-20 lg:opacity-0 group-hover:opacity-100 transition-all lg:translate-y-2 group-hover:translate-y-0">
                      {[4, 6, 12, 16, 24].map(qt => (
                        <button key={qt} onClick={(e) => { e.stopPropagation(); triggerTapAnimation(product.id); addItem(product, qt); }}
                          className="bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white font-bold text-xs py-1.5 px-2 rounded-lg transition-colors active:scale-90">
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
      <div className={`fixed inset-0 z-50 flex flex-col bg-zinc-950 transition-transform duration-300 lg:relative lg:z-10 lg:w-[450px] xl:w-[550px] xl:w-[600px] lg:bg-zinc-900/90 lg:backdrop-blur-2xl lg:border-l lg:border-zinc-800 lg:shadow-2xl ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
        <div className="p-4 lg:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 lg:bg-transparent">
          <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-3">
            <ShoppingCart className="text-blue-500" /> Carrinho
          </h2>
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-xs px-3 py-1 rounded-full font-bold">{totalItemsCount} itens</span>
            <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg">
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
                <div className="flex gap-4 mb-4">
                  {item.imageUrl && (
                    <div className="w-16 h-16 flex-shrink-0 bg-white/5 rounded-xl flex items-center justify-center p-1.5 border border-white/5">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 flex justify-between items-start">
                    <div className="flex-1 pr-3">
                      <div className="font-bold text-lg text-zinc-100 line-clamp-2 leading-tight">{item.name}</div>
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
                    <div className="font-black text-xl text-emerald-400 whitespace-nowrap pl-2">
                      R$ {item.subtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 mt-1">
                  <button onClick={() => updateQuantity(item.cartKey, item.quantity - 1)} className="p-4 lg:p-3 hover:bg-zinc-800 text-zinc-400 hover:text-white transition active:scale-95"><Minus size={22} /></button>
                  <span className="font-black text-2xl w-16 text-center text-white">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.cartKey, item.quantity + 1)} className="p-4 lg:p-3 hover:bg-zinc-800 text-zinc-400 hover:text-white transition active:scale-95"><Plus size={22} /></button>
                  <div className="w-px h-8 bg-zinc-800 mx-2"></div>
                  <button onClick={() => removeItem(item.cartKey)} className="p-4 lg:p-3 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition flex-1 flex justify-center active:scale-95"><Trash2 size={22} /></button>
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
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-4 lg:py-5 px-6 rounded-xl lg:rounded-2xl text-xl transition-all shadow-lg active:scale-95 flex justify-between items-center group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <span className="z-10"><span className="hidden lg:inline">[F12 ou *]</span> Cobrar</span>
            <span className="z-10 bg-black/20 p-2 rounded-xl text-sm italic">Finalizar</span>
          </button>
        </div>
      </div>

      {/* ── Bottom Sheet Mobile ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {/* Backdrop (only when expanded) */}
        {sheetExpanded && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity"
            onClick={() => setSheetExpanded(false)}
          />
        )}

        <div
          className={`relative z-40 bg-zinc-950 border-t-2 border-zinc-800 shadow-2xl transition-all duration-350 ease-out pb-safe ${
            sheetExpanded ? 'max-h-[88dvh]' : totalItemsCount > 0 ? 'max-h-[280px]' : 'max-h-[60px]'
          }`}
          style={{ willChange: 'max-height' }}
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
        >
          {/* ── COLLAPSED / SUMMARY BAR (totalmente clicável) ── */}
          {!sheetExpanded && (
            <div
              className="cursor-pointer select-none"
              onClick={() => totalItemsCount > 0 && setSheetExpanded(true)}
            >
              {/* Drag pill */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-zinc-700" />
              </div>

              {totalItemsCount === 0 ? (
                <div className="flex items-center justify-center gap-2 px-4 py-3 text-zinc-500 text-sm">
                  <ShoppingCart size={16} />
                  <span>Carrinho vazio</span>
                </div>
              ) : (
                <>
                  {/* Lista rápida de itens: nome + qtd + preço */}
                  <div className="px-4 pt-0 pb-1 space-y-0.5">
                    {items.slice(-4).map(item => (
                      <div key={item.cartKey} className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-zinc-300 text-xs font-medium truncate flex-1">{item.name}</span>
                        <span className="text-zinc-500 text-xs shrink-0">×{item.quantity}</span>
                        <span className="text-emerald-400 text-xs font-bold shrink-0 ml-1">
                          R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    {items.length > 4 && (
                      <div className="text-[10px] text-zinc-500 font-medium">
                        + {items.length - 4} {items.length - 4 === 1 ? 'item' : 'itens'}…
                      </div>
                    )}
                  </div>

                  {/* Linha divisória */}
                  <div className="mx-4 border-t border-zinc-800 mb-1" />

                  {/* Footer: avatares + total + cobrar */}
                  <div className="flex items-center gap-3 px-4 pb-3">
                    {/* Avatars dos últimos 3 produtos */}
                    <div className="flex -space-x-2 shrink-0">
                      {items.slice(-3).map((item, i) => (
                        <div key={item.cartKey} className="w-8 h-8 rounded-full bg-white border-2 border-zinc-900 overflow-hidden flex items-center justify-center" style={{ zIndex: 3 - i }}>
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                            : <ShoppingCart size={12} className="text-zinc-500" />
                          }
                        </div>
                      ))}
                    </div>

                    {/* Contagem + total */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] text-zinc-400 font-medium ${badgeBounce ? 'badge-bounce' : ''}`}>
                        {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
                      </div>
                      <div className="text-white font-black text-base leading-tight">
                        R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Botão COBRAR */}
                    <button
                      onClick={e => { e.stopPropagation(); setIsPaymentOpen(true); }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 px-5 rounded-xl shadow-lg active:scale-95 transition-transform shrink-0"
                    >
                      COBRAR
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── EXPANDED: premium card list ── */}
          {sheetExpanded && (
            <div className="flex flex-col" style={{ maxHeight: '88dvh' }}>

              {/* Header do carrinho expandido */}
              <div
                className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-zinc-800 cursor-pointer"
                onClick={() => setSheetExpanded(false)}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-blue-400" />
                  <span className="text-white font-bold text-base">Seu Pedido</span>
                  <span className="text-xs bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">{totalItemsCount}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-8 h-1 rounded-full bg-zinc-600" />
                  <span className="text-[10px] text-zinc-500">fechar</span>
                </div>
              </div>

              {/* Lista de itens com imagens */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 custom-scrollbar" style={{ maxHeight: 'calc(88dvh - 145px)' }}>
                {items.map(item => (
                  <div key={item.cartKey} className="flex items-center gap-3 p-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    {/* Imagem do produto */}
                    <div className="w-14 h-14 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                        : <ShoppingCart size={20} className="text-zinc-400" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white line-clamp-2 leading-tight">{item.name}</div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-[10px] text-indigo-400 font-medium mt-0.5 line-clamp-1">
                          {item.modifiers.map((m: any) => m.optionName).join(', ')}
                        </div>
                      )}
                      <div className="text-emerald-400 font-black text-base mt-0.5">
                        R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Controles de quantidade */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button onClick={() => updateQuantity(item.cartKey, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-blue-600 text-white rounded-lg transition active:scale-90"><Plus size={14} /></button>
                      <span className="font-bold text-sm text-white w-8 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartKey, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-red-600/60 text-zinc-400 hover:text-white rounded-lg transition active:scale-90"><Minus size={14} /></button>
                    </div>

                    {/* Remover */}
                    <button onClick={() => removeItem(item.cartKey)} className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-400 transition shrink-0 active:scale-90">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer com total e cobrar */}
              <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-zinc-400 font-medium">Total</span>
                  <span className="text-2xl font-black text-white">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <button
                  disabled={totalItemsCount === 0}
                  onClick={() => setIsPaymentOpen(true)}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-4 px-4 rounded-2xl text-lg transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2"
                >
                  <ShoppingCart size={20} />
                  Cobrar — R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </button>
              </div>
            </div>
          )}
        </div>
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
        onClose={() => {
          setIsPaymentOpen(false);
          setSheetExpanded(false);
          if (!('ontouchstart' in window)) {
            let checks = 0;
            const interval = setInterval(() => {
              const input = document.getElementById('product-search-input');
              if (input) input.focus();
              checks++;
              if (checks > 10) clearInterval(interval);
            }, 50);
          }
        }}
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

      {/* Modal de Quantidade */}
      {productToSetQuantity && (
        <div className="fixed inset-0 z-[100] flex items-start pt-[20dvh] justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col mb-auto">
            <h3 className="text-xl font-bold text-white mb-2 text-center line-clamp-2">{productToSetQuantity.name}</h3>
            <p className="text-zinc-400 mb-6 text-sm text-center">Informe a quantidade desejada:</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (tempQuantity > 0) {
                addItem(productToSetQuantity, tempQuantity);
                setProductToSetQuantity(null);
                setTempQuantity(1);
                setTimeout(() => {
                  if (!('ontouchstart' in window)) {
                    (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus();
                  }
                }, 10);
              }
            }}>
              <input
                type="number"
                inputMode="decimal"
                min="0.001"
                step="any"
                autoFocus
                value={tempQuantity === 0 ? '' : tempQuantity}
                onChange={(e) => setTempQuantity(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full text-center text-4xl font-black bg-zinc-950 border border-zinc-800 rounded-2xl py-6 text-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 mb-6 shadow-inner"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => { 
                  setProductToSetQuantity(null); 
                  setTimeout(() => {
                    if (!('ontouchstart' in window)) {
                      (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus();
                    }
                  }, 10); 
                }} className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition text-lg active:scale-95">
                  Cancelar
                </button>
                <button type="submit" disabled={tempQuantity <= 0} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:text-white/50 text-white font-bold rounded-xl transition text-lg active:scale-95 shadow-lg shadow-blue-500/20">
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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


