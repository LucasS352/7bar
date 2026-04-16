'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { X, Delete, UserCheck, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SwitchUserModal({ isOpen, onClose }: Props) {
  const { login } = useAuthStore();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (d: string) => {
    if (pin.length < 6) setPin(p => p + d);
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  const handleConfirm = async () => {
    if (pin.length < 4) {
      toast.error('O PIN deve ter entre 4 e 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/switch-pin', { pin });
      login(res.data.access_token, res.data.user);
      toast.success(`✅ Turno assumido por ${res.data.user.name}`, { duration: 3000 });
      setPin('');
      onClose();
    } catch {
      // Animação de erro
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
      toast.error('PIN inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  const roleLabel = (role: string) => role === 'admin' ? 'Gerente' : 'Operador de Caixa';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md">
      <div className={`bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${shake ? 'animate-bounce' : ''}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="text-blue-500" size={22} />
              Trocar Operador
            </h2>
            <p className="text-zinc-500 text-sm mt-0.5">Digite seu PIN para assumir o turno</p>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* PIN Display */}
        <div className="px-8 pt-6 pb-2">
          <div className={`flex justify-center gap-3 transition-all ${shake ? 'translate-x-2' : ''}`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
                  i < pin.length
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-700 bg-zinc-950'
                }`}
              >
                {i < pin.length && (
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-zinc-600 mt-3">{pin.length} de 4-6 dígitos</p>
        </div>

        {/* Numpad */}
        <div className="px-8 pb-6 pt-4 grid grid-cols-3 gap-3">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'del') {
              return (
                <button key={i} onClick={handleDelete} className="flex items-center justify-center h-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition active:scale-90">
                  <Delete size={22} />
                </button>
              );
            }
            return (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="flex items-center justify-center h-14 rounded-2xl bg-zinc-800 hover:bg-blue-600 text-white font-bold text-xl transition active:scale-90"
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Confirmar */}
        <div className="px-8 pb-6">
          <button
            onClick={handleConfirm}
            disabled={loading || pin.length < 4}
            className="w-full py-4 rounded-xl font-bold text-base bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <UserCheck size={20} />}
            Confirmar Troca
          </button>
        </div>
      </div>
    </div>
  );
}
