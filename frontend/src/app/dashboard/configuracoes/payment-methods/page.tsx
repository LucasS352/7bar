'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { CreditCard, Plus, Trash2, Loader2, Edit2, Check, X } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  tPag: string;
  active: boolean;
  hasVariablePricing: boolean;
}

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newHasVariablePricing, setNewHasVariablePricing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editHasVariablePricing, setEditHasVariablePricing] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payment-methods');
      setMethods(res.data);
    } catch {
      toast.error('Erro ao carregar formas de pagamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Digite o nome da forma de pagamento.'); return; }
    setSaving(true);
    try {
      await api.post('/payment-methods', { name: newName.trim(), hasVariablePricing: newHasVariablePricing });
      toast.success(`"${newName.trim()}" adicionado!`);
      setNewName('');
      setNewHasVariablePricing(false);
      fetch();
    } catch {
      toast.error('Erro ao adicionar forma de pagamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) { toast.error('Nome inválido.'); return; }
    try {
      await api.patch(`/payment-methods/${id}`, { name: editName.trim(), hasVariablePricing: editHasVariablePricing });
      toast.success('Atualizado!');
      setEditingId(null);
      fetch();
    } catch {
      toast.error('Erro ao atualizar.');
    }
  };

  const handleToggle = async (method: PaymentMethod) => {
    try {
      await api.patch(`/payment-methods/${method.id}`, { active: !method.active });
      toast.success(method.active ? 'Desativado.' : 'Ativado!');
      fetch();
    } catch {
      toast.error('Erro ao alterar status.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/payment-methods/${id}`);
      toast.success('Excluído.');
      fetch();
    } catch {
      toast.error('Erro ao excluir.');
    }
  };

  const BUILTIN = [
    { label: 'Dinheiro', color: 'text-emerald-400' },
    { label: 'PIX', color: 'text-teal-400' },
    { label: 'Cartão Crédito', color: 'text-indigo-400' },
    { label: 'Cartão Débito', color: 'text-sky-400' },
    { label: 'Consumo Colaborador', color: 'text-amber-400' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <CreditCard className="text-blue-500" /> Formas de Pagamento
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Gerencie os métodos de pagamento aceitos. Os métodos customizados aparecem no checkout e no relatório de caixa separadamente.
        </p>
      </div>

      {/* Métodos padrão */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Métodos Padrão (fixos)</h2>
        <div className="space-y-2">
          {BUILTIN.map(m => (
            <div key={m.label} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
              <span className={`font-semibold ${m.color}`}>{m.label}</span>
              <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">Fixo</span>
            </div>
          ))}
        </div>
      </div>

      {/* Métodos customizados */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Métodos Customizados</h2>

        {/* Adicionar novo */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Ex: iFood, Ticket Alimentação, Vale..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition active:scale-95"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Adicionar
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input 
              type="checkbox" 
              checked={newHasVariablePricing} 
              onChange={e => setNewHasVariablePricing(e.target.checked)} 
              className="rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900" 
            />
            Preço Variável por Produto (Tabela de preços paralela)
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-zinc-500" size={28} />
          </div>
        ) : methods.length === 0 ? (
          <div className="text-center py-8 text-zinc-600">
            <CreditCard size={36} className="mx-auto mb-2 opacity-30" />
            <p>Nenhum método customizado cadastrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {methods.map(m => (
              <div key={m.id} className={`flex flex-col gap-2 p-3 border rounded-xl transition ${m.active ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-900/40 border-zinc-800/50 opacity-60'}`}>
                <div className="flex items-center gap-3">
                  {editingId === m.id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(m.id); if (e.key === 'Escape') setEditingId(null); }}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <button onClick={() => handleSaveEdit(m.id)} className="p-1.5 text-emerald-400 hover:text-emerald-300 transition"><Check size={16} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="font-semibold text-zinc-200">{m.name}</span>
                        {m.hasVariablePricing && <span className="ml-2 text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Preço Variável</span>}
                      </div>
                      <button
                        onClick={() => handleToggle(m)}
                        className={`text-xs px-3 py-1 rounded-full border font-bold transition ${m.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'}`}
                      >
                        {m.active ? 'Ativo' : 'Inativo'}
                      </button>
                      <button onClick={() => { setEditingId(m.id); setEditName(m.name); setEditHasVariablePricing(m.hasVariablePricing); }} className="p-1.5 text-zinc-500 hover:text-blue-400 transition"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(m.id, m.name)} className="p-1.5 text-zinc-500 hover:text-red-400 transition"><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
                {editingId === m.id && (
                  <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer ml-1 mt-1">
                    <input 
                      type="checkbox" 
                      checked={editHasVariablePricing} 
                      onChange={e => setEditHasVariablePricing(e.target.checked)} 
                      className="rounded bg-zinc-900 border-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900" 
                    />
                    Preço Variável por Produto
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs text-blue-400/80">
          💡 <strong>Dica iFood:</strong> Ao fechar uma venda com forma "iFood", o caixa pode digitar o valor real recebido pelo iFood (que pode ter 12% de taxa). Isso garante que o fechamento do caixa bata no final do dia.
        </div>
      </div>
    </div>
  );
}
