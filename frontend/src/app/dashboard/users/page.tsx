"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Shield, ShieldAlert, CheckCircle2, XCircle, Plus, KeyRound, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import UserModal from "@/components/UserModal";
import OperatorsManagementModal from "@/components/OperatorsManagementModal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [operatorsModalOpen, setOperatorsModalOpen] = useState(false);

  // Discount PIN modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [discountPin, setDiscountPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users");
      setUsers(data);
    } catch {
      toast.error("Erro ao carregar usuários. Apenas admins têm acesso.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, active: boolean) => {
    try {
      await api.patch(`/users/${id}/toggle-status`);
      toast.success(`Usuário ${active ? 'inativado' : 'ativado'} com sucesso.`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao alterar status.");
    }
  };

  const handleOpenModal = () => {
    if (users.length >= 2) {
      toast.error("Limite atingido: O plano permite no máximo 2 usuários por loja (1 Admin e 1 Colaborador).");
      return;
    }
    setEditUser(null);
    setModalOpen(true);
  };

  const handleRowClick = (u: User) => {
    if (u.role === "operator") {
      setOperatorsModalOpen(true);
    } else {
      setEditUser(u);
      setModalOpen(true);
    }
  };

  const handleSaveDiscountPin = async () => {
    if (discountPin.length < 4) { toast.error("O PIN deve ter no mínimo 4 dígitos."); return; }
    if (discountPin !== confirmPin) { toast.error("Os PINs não coincidem."); return; }
    setSavingPin(true);
    try {
      await api.post('/tenants/me/discount-pin', { pin: discountPin });
      toast.success("PIN de desconto configurado com sucesso!");
      setPinModalOpen(false);
      setDiscountPin(''); setConfirmPin('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao salvar o PIN.");
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Equipe</h1>
          <p className="text-zinc-400 text-sm mt-1">Gerencie os acessos do seu estabelecimento</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPinModalOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-400 px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95"
            title="Configurar PIN de desconto para o PDV"
          >
            <KeyRound size={16} /> PIN de Desconto
          </button>
          <button
            onClick={handleOpenModal}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={18} /> Novo Colaborador
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-md">
          <table className="w-full text-left bg-transparent border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                <th className="p-4 font-medium">Colaborador</th>
                <th className="p-4 font-medium">Função</th>
                <th className="p-4 font-medium">Status do Acesso</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors cursor-pointer group" onClick={() => handleRowClick(u)}>
                  <td className="p-4">
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-sm text-zinc-500">{u.email}</p>
                  </td>
                  <td className="p-4">
                    {u.role === "admin" ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
                        <ShieldAlert size={14} /> Admin
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md bg-zinc-700/30 text-zinc-300 border border-zinc-600/50 w-fit">
                        <Shield size={14} /> Operador de Caixa
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {u.active ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                        <CheckCircle2 size={14} /> Acesso Liberado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 w-fit">
                        <XCircle size={14} /> Acesso Bloqueado
                      </span>
                    )}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleStatus(u.id, u.active)}
                      disabled={u.role === "admin"}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                        u.role === "admin"
                          ? "opacity-30 cursor-not-allowed border-zinc-800 bg-zinc-900"
                          : u.active
                          ? "hover:bg-red-500/10 text-red-400 border-red-500/20 hover:border-red-500/50"
                          : "hover:bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50"
                      }`}
                    >
                      {u.active ? "Bloquear Acesso" : "Liberar Acesso"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-zinc-500">Nenhum colaborador encontrado.</td></tr>
              )}
            </tbody>
          </table>
          <div className="p-4 bg-zinc-950/30 border-t border-zinc-800/80 text-xs text-zinc-500 flex justify-between items-center">
            <span>Limites: {users.length} de 2 usuários (Máx. 1 Admin, 1 Operador)</span>
            <span className="flex items-center gap-1.5 text-amber-500/70">
              <Lock size={12} /> PIN de Desconto protege alterações de preço no PDV
            </span>
          </div>
        </div>
      )}

      {/* Modal de PIN de Desconto */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <KeyRound size={20} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">PIN de Desconto</h3>
                  <p className="text-xs text-zinc-500">Protege alterações de preço no PDV</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">Novo PIN (mín. 4 dígitos)</label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={discountPin}
                    onChange={e => setDiscountPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    maxLength={8}
                  />
                  <button onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">Confirmar PIN</label>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  maxLength={8}
                  onKeyDown={e => e.key === 'Enter' && handleSaveDiscountPin()}
                />
              </div>
              {discountPin && confirmPin && discountPin !== confirmPin && (
                <p className="text-red-400 text-xs text-center">Os PINs não coincidem</p>
              )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => { setPinModalOpen(false); setDiscountPin(''); setConfirmPin(''); }}
                className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDiscountPin}
                disabled={savingPin || discountPin.length < 4 || discountPin !== confirmPin}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold transition active:scale-95"
              >
                {savingPin ? 'Salvando...' : 'Salvar PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <UserModal
          user={editUser}
          onClose={() => { setModalOpen(false); setEditUser(null); }}
          onSuccess={() => { setModalOpen(false); setEditUser(null); fetchUsers(); }}
        />
      )}
      {operatorsModalOpen && (
        <OperatorsManagementModal onClose={() => setOperatorsModalOpen(false)} />
      )}
    </div>
  );
}
