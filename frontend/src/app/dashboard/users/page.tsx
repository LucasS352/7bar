"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Shield, ShieldAlert, CheckCircle2, XCircle, Plus, Edit2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import UserModal from "@/components/UserModal";

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (err: any) {
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
    setModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Equipe</h1>
          <p className="text-zinc-400 text-sm mt-1">Gerencie os acessos do seu estabelecimento</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={18} />
          Novo Colaborador
        </button>
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
                <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
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
                  <td className="p-4">
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
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    Nenhum colaborador encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="p-4 bg-zinc-950/30 border-t border-zinc-800/80 text-xs text-zinc-500 flex justify-between">
            <span>
              Limites: {users.length} de 2 usuários (Máx. 1 Admin, 1 Operador)
            </span>
          </div>
        </div>
      )}

      {modalOpen && (
        <UserModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
