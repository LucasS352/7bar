"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Package, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface PackagingItem {
  id: string;
  name: string;
  multiplier: number;
  createdAt?: string;
}

interface ManagePackagingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPackagingsChange?: () => void;
}

export default function ManagePackagingsModal({
  isOpen,
  onClose,
  onPackagingsChange,
}: ManagePackagingsModalProps) {
  const [packagings, setPackagings] = useState<PackagingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newMultiplier, setNewMultiplier] = useState<number | ''>(6);

  const fetchPackagings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/purchase-orders/packagings/all');
      setPackagings(data || []);
    } catch {
      toast.error('Erro ao buscar embalagens.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPackagings();
    }
  }, [isOpen, fetchPackagings]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const trimmedName = newName.trim();
    const multNum = Number(newMultiplier);

    if (!trimmedName) {
      toast.error('Informe o nome da embalagem (ex: Fardo c/ 6).');
      return;
    }

    if (!multNum || multNum < 1) {
      toast.error('Informe uma quantidade de unidades válida (maior ou igual a 1).');
      return;
    }

    setCreating(true);
    try {
      await api.post('/purchase-orders/packagings', {
        name: trimmedName,
        multiplier: multNum,
      });

      setNewName('');
      setNewMultiplier(6);
      toast.success(`Embalagem "${trimmedName}" cadastrada com sucesso!`);
      await fetchPackagings();
      onPackagingsChange?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erro ao cadastrar embalagem.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/purchase-orders/packagings/${id}`);
      toast.success(`Embalagem "${name}" removida!`);
      await fetchPackagings();
      onPackagingsChange?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erro ao remover embalagem.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/90 backdrop-blur-sm z-10 sticky top-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Package size={18} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Gerenciar Embalagens</h2>
              <p className="text-zinc-500 text-xs">Configure fardos, caixas e kits para conversão</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Cadastro Rápido */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5">
            <label className="text-xs font-semibold text-zinc-400 block">
              Cadastrar Nova Embalagem:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome (ex: Fardo c/ 6)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                disabled={creating}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-50"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Und (ex: 6)"
                  value={newMultiplier}
                  onChange={(e) => setNewMultiplier(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  disabled={creating}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none text-center transition-colors disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim() || !newMultiplier}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 rounded-xl font-bold transition flex items-center justify-center shadow-md active:scale-95 shrink-0"
                title="Adicionar Embalagem"
              >
                {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Exemplo: ao cadastrar <strong>Fardo c/ 12</strong> (Und: 12), dar entrada em 2 fardos somará 24 unidades no estoque.
            </p>
          </div>

          {/* Lista de Embalagens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1">
              <span>Embalagens Cadastradas</span>
              <span className="text-zinc-500">{packagings.length} {packagings.length === 1 ? 'tipo' : 'tipos'}</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : packagings.length === 0 ? (
              <div className="text-center py-8 px-4 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-xl">
                <Package size={28} className="mx-auto text-zinc-600 mb-2 opacity-60" />
                <p className="text-zinc-400 text-sm font-medium">Nenhuma embalagem cadastrada.</p>
                <p className="text-zinc-600 text-xs mt-0.5">Cadastre acima os formatos de venda/compra do seu estabelecimento.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
                {packagings.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center bg-zinc-950 border border-zinc-800 hover:border-zinc-700/80 p-3 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-800 font-mono text-xs font-bold">
                        {p.multiplier}x
                      </div>
                      <div>
                        <strong className="block text-sm text-zinc-200">{p.name}</strong>
                        <span className="text-xs text-emerald-400 font-medium">
                          Multiplica por {p.multiplier} un no estoque
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={deletingId === p.id}
                      className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Excluir embalagem"
                    >
                      {deletingId === p.id ? (
                        <Loader2 size={16} className="animate-spin text-red-400" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950/60 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-5 py-2 rounded-xl text-sm font-bold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
