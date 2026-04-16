"use client";
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useCartStore, Product } from '@/store/cart';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Search, ShoppingCart, LogOut, PackageOpen, Minus, Plus, Trash2, LayoutDashboard, FileText, ArrowDownUp, UserCheck } from 'lucide-react';
import { PaymentModal } from '@/components/PaymentModal';
import { CashRegisterModal } from '@/components/CashRegisterModal';
import { CloseRegisterModal } from '@/components/CloseRegisterModal';
import { CashMovementModal } from '@/components/CashMovementModal';
import { SwitchUserModal } from '@/components/SwitchUserModal';

export default function PosPage() {
  const router = useRouter();
  const { token, user, logout } = useAuthStore();
  const { items, total, addItem, updateQuantity, removeItem } = useCartStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCloseRegisterOpen, setIsCloseRegisterOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [register, setRegister] = useState<any>(undefined); // undefined = loading, null = closed, object = open

  const isAdmin = user?.role === 'admin';
  const roleLabel = (role?: string) => role === 'admin' ? 'Gerente' : 'Operador de Caixa';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    
    // Check if Cash Register is open
    api.get('/cash-registers/current')
      .then(res => setRegister(res.data || null))
      .catch(console.error);

    setIsLoading(true);
    api.get('/products')
      .then(res => setProducts(res.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [token, router]);

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
    logout();
    router.push('/login');
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim() !== '') {
      const match = products.find(p => p.shortCode?.toLowerCase() === search.toLowerCase().trim() || p.barcode === search.trim());
      if (match) {
        addItem(match);
        setSearch('');
      } else if (filtered.length === 1) {
        addItem(filtered[0]);
        setSearch('');
      }
    }
  };

  const filtered = products.filter(p => 
    p.active !== false && (
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.barcode?.includes(search) || 
      p.shortCode?.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (!token) return null; // Wait for redirect

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* Esquerda: PDV e Produtos */}
      <div className="flex-1 flex flex-col p-6 pr-4">
        {/* Header Superior */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
              7bar POS
            </h1>
            <p className="text-emerald-400 font-medium text-sm flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {roleLabel(user?.role)}: <span className="font-semibold text-white">{user?.name}</span>
              <span className="text-zinc-500">({user?.tenant})</span>
              {register?.id && <span className="ml-2 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-400 uppercase tracking-widest hidden sm:inline-block">Caixa Aberto</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {register?.id && (
              <button onClick={() => setIsMovementOpen(true)} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition font-semibold text-sm whitespace-nowrap">
                <ArrowDownUp size={18} /> Sangria / Reposição
              </button>
            )}
            {/* Apenas Gerente vê o Dashboard */}
            {isAdmin && (
              <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition font-semibold">
                <LayoutDashboard size={18} /> Dashboard
              </button>
            )}
            {/* Apenas Gerente vê o Relatório de Caixa */}
            {isAdmin && (
              <button onClick={() => setIsCloseRegisterOpen(true)} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition font-semibold text-sm whitespace-nowrap">
                <FileText size={18} /> Relatório de Caixa
              </button>
            )}
            {/* Botão Trocar Usuário */}
            <button onClick={() => setIsSwitchOpen(true)} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition font-semibold text-sm whitespace-nowrap">
              <UserCheck size={18} /> Trocar Usuário
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition font-semibold">
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>
        
        {/* Busca com Estilo Glass */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={22} className="text-blue-500" />
          </div>
          <input 
            type="text" 
            placeholder="[F2] Bipe ou Digite o Cód Curto e aperte Enter..." 
            className="w-full py-4 pl-12 pr-4 text-2xl font-bold bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-zinc-500 shadow-inner tracking-tight"
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
              {filtered.map(product => (
                <div key={product.id} className="group relative bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:border-blue-500 transition-all flex flex-col items-center justify-between min-h-[160px] overflow-hidden shadow-sm hover:shadow-md">
                  {/* Fundo gradiente leve no hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  
                  {/* Área principal do botão (Adiciona 1 un) */}
                  <button onClick={() => addItem(product)} className="w-full flex-1 flex flex-col items-center justify-center z-10 active:scale-95 transition-transform">
                    {product.shortCode && (
                       <span className="absolute top-3 right-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-extrabold text-[11px] px-2 py-0.5 rounded shadow-sm">
                         {product.shortCode}
                       </span>
                    )}
                    <span className="font-semibold text-[1.1rem] text-center leading-snug z-10 line-clamp-2 px-1 text-zinc-100">{product.name}</span>
                    <span className="text-blue-400 font-bold mt-2 text-xl z-10">R$ {product.priceSell.toFixed(2)}</span>
                    <div className="text-xs text-zinc-500 mt-2 z-10 border border-zinc-700 px-2 py-0.5 rounded-full bg-zinc-950 flex items-center gap-1 font-medium">
                       Estoque: {product.stock}
                    </div>
                  </button>

                  {/* Multiplicadores (Caixa, Fardo) - Aparecem no hover da caixa principal */}
                  <div className="w-full flex justify-center gap-1 mt-3 z-20 sm:opacity-0 group-hover:opacity-100 transition-all sm:translate-y-2 group-hover:translate-y-0">
                    {[4, 6, 12, 16, 24].map(qt => (
                      <button 
                        key={qt}
                        onClick={(e) => { e.stopPropagation(); addItem(product, qt); }}
                        className="bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white font-bold text-[10px] sm:text-xs py-1.5 px-2 rounded-lg transition-colors active:scale-90"
                        title={`Adicionar fardo de ${qt}`}
                      >
                        +{qt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Direita: Carrinho Flutuante e Checkout */}
      <div className="w-[420px] bg-zinc-900/90 backdrop-blur-2xl border-l border-zinc-800 flex flex-col shadow-2xl z-10 relative">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <ShoppingCart className="text-blue-500" /> Carrinho
          </h2>
          <span className="bg-blue-600 text-xs px-3 py-1 rounded-full font-bold">{items.length} itens</span>
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
              <div key={item.id} className="flex flex-col p-4 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm hover:border-zinc-700 transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-semibold text-zinc-200 line-clamp-2 pr-2">{item.name}</div>
                  <div className="font-bold text-lg text-emerald-400 whitespace-nowrap">
                    R$ {item.subtotal.toFixed(2)}
                  </div>
                </div>
                
                <div className="flex justify-between items-center bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition group-hover:text-blue-400">
                    <Minus size={18} />
                  </button>
                  <span className="font-bold w-10 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition group-hover:text-blue-400">
                    <Plus size={18} />
                  </button>
                  <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                  <button onClick={() => removeItem(item.id)} className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition w-full flex justify-center">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé de Checkout */}
        <div className="p-6 bg-zinc-950 border-t border-zinc-800">
          <div className="flex justify-between items-end mb-6">
            <span className="text-zinc-400 font-medium text-lg">Total</span>
            <span className="text-4xl font-black text-white">R$ {total.toFixed(2)}</span>
          </div>
          
          <button 
            disabled={items.length === 0}
            onClick={() => setIsPaymentOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-5 px-6 rounded-2xl text-xl transition-all shadow-lg active:scale-95 flex justify-between items-center group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <span className="z-10">[F4] Cobrar</span>
            <span className="z-10 bg-black/20 p-2 rounded-xl text-sm italic">Finalizar</span>
          </button>
        </div>
      </div>

      {register === null && <CashRegisterModal onOpen={setRegister} />}
      <CloseRegisterModal 
        isOpen={isCloseRegisterOpen} 
        registerId={register?.id} 
        onClose={(closed) => {
          setIsCloseRegisterOpen(false);
          if (closed) setRegister(null); // Forces the open modal to show again or logout
        }} 
      />
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
      <SwitchUserModal isOpen={isSwitchOpen} onClose={() => setIsSwitchOpen(false)} />
      {register && (
        <CashMovementModal 
          isOpen={isMovementOpen}
          registerId={register.id}
          onClose={() => setIsMovementOpen(false)}
        />
      )}
    </div>
  );
}
