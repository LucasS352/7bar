'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  FileText, Plus, Pencil, Trash2, Loader2, X, Save, ChevronDown, ChevronUp, CheckCircle
} from 'lucide-react';

interface GrupoTributacao {
  id: string;
  nome: string;
  ativo: boolean;
  csosn?: string;
  cstIcms?: string;
  cfop: string;
  aliqIcms: number;
  redBcIcms: number;
  cstPis: string;
  aliqPis: number;
  cstCofins: string;
  aliqCofins: number;
  cstIpi?: string;
  aliqIpi: number;
}

const EMPTY_FORM: Omit<GrupoTributacao, 'id'> = {
  nome: '', ativo: true,
  csosn: '102', cstIcms: '', cfop: '5102',
  aliqIcms: 0, redBcIcms: 0,
  cstPis: '99', aliqPis: 0,
  cstCofins: '99', aliqCofins: 0,
  cstIpi: '', aliqIpi: 0,
};

const CSOSN_OPTIONS = [
  { value: '102', label: '102 — SN sem crédito de ICMS' },
  { value: '400', label: '400 — SN — Isento de ICMS' },
  { value: '500', label: '500 — SN — ICMS cobrado anteriormente por ST' },
  { value: '900', label: '900 — SN — Outros' },
];
const CST_PIS_COFINS_OPTIONS = [
  { value: '99', label: '99 — SN (não informado)' },
  { value: '49', label: '49 — Outras Operações de Saída' },
  { value: '01', label: '01 — Tributado' },
  { value: '07', label: '07 — Isento' },
];

export default function TributacaoPage() {
  const [grupos, setGrupos] = useState<GrupoTributacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GrupoTributacao | null>(null);
  const [form, setForm] = useState<Omit<GrupoTributacao, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/tributacao')
      .then(res => setGrupos(res.data))
      .catch(() => toast.error('Erro ao carregar grupos tributários.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (g: GrupoTributacao) => {
    setEditing(g);
    const { id, ...rest } = g;
    setForm(rest);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.cfop) {
      toast.error('Nome e CFOP são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/tributacao/${editing.id}`, form);
        toast.success('Grupo atualizado!');
      } else {
        await api.post('/tributacao', form);
        toast.success('Grupo criado!');
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar grupo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g: GrupoTributacao) => {
    if (!confirm(`Remover "${g.nome}"? Produtos vinculados perderão o grupo.`)) return;
    try {
      await api.delete(`/tributacao/${g.id}`);
      toast.success('Grupo removido.');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao remover grupo.');
    }
  };

  const f = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const inputCls = 'w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm';
  const labelCls = 'text-xs font-semibold text-zinc-400 mb-1 block uppercase tracking-wider';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="text-blue-500" size={30} />
          Grupos Tributários
        </h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition active:scale-95"
        >
          <Plus size={18} /> Novo Grupo
        </button>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-400">
        Os grupos tributários definem as regras fiscais (CSOSN, CFOP, PIS, COFINS) aplicadas por produto na emissão da NFC-e.
        Para o Simples Nacional com CSOSN 102 e CFOP 5102, crie um grupo padrão e vincule aos produtos.
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={36} /></div>
      ) : grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <FileText size={48} className="mb-4 opacity-30" />
          <p className="text-lg">Nenhum grupo cadastrado.</p>
          <p className="text-sm">Crie um grupo para vincular aos produtos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(g => (
            <div key={g.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 flex items-center gap-4 transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-white text-lg">{g.nome}</span>
                  {g.ativo
                    ? <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Ativo</span>
                    : <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-500 px-2 py-0.5 rounded-full">Inativo</span>
                  }
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-mono">
                  <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-1 rounded-lg">CSOSN: {g.csosn || '—'}</span>
                  <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg">CFOP: {g.cfop}</span>
                  <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-1 rounded-lg">CST PIS: {g.cstPis}</span>
                  <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-1 rounded-lg">CST COFINS: {g.cstCofins}</span>
                  {Number(g.aliqIcms) > 0 && <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded-lg">ICMS: {g.aliqIcms}%</span>}
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(g)} className="p-2 bg-zinc-800 hover:bg-blue-600 rounded-xl transition text-zinc-400 hover:text-white">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(g)} className="p-2 bg-zinc-800 hover:bg-red-500/20 rounded-xl transition text-zinc-400 hover:text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">{editing ? 'Editar Grupo' : 'Novo Grupo Tributário'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className={labelCls}>Nome do Grupo *</label>
                <input className={inputCls} value={form.nome} onChange={e => f('nome', e.target.value)} placeholder="Ex: TRIBUTADOS - Consumidor Final SP" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>CSOSN (Simples Nacional)</label>
                  <select className={inputCls} value={form.csosn} onChange={e => f('csosn', e.target.value)}>
                    <option value="">— Não usar —</option>
                    {CSOSN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                  </select>
                  <p className="text-zinc-600 text-xs mt-1">{CSOSN_OPTIONS.find(o => o.value === form.csosn)?.label || ''}</p>
                </div>
                <div>
                  <label className={labelCls}>CFOP *</label>
                  <input className={`${inputCls} font-mono`} value={form.cfop} onChange={e => f('cfop', e.target.value)} placeholder="5102" maxLength={4} />
                  <p className="text-zinc-600 text-xs mt-1">5102 = Venda interna consumidor</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>CST PIS</label>
                  <select className={inputCls} value={form.cstPis} onChange={e => f('cstPis', e.target.value)}>
                    {CST_PIS_COFINS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>CST COFINS</label>
                  <select className={inputCls} value={form.cstCofins} onChange={e => f('cstCofins', e.target.value)}>
                    {CST_PIS_COFINS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                  </select>
                </div>
              </div>

              {/* Avançado */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition"
              >
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Configurações avançadas (ICMS, IPI, alíquotas)
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                  <div>
                    <label className={labelCls}>Alíq. ICMS (%)</label>
                    <input type="number" className={inputCls} value={form.aliqIcms} onChange={e => f('aliqIcms', parseFloat(e.target.value) || 0)} step="0.01" />
                  </div>
                  <div>
                    <label className={labelCls}>Red. Base Cálc. ICMS (%)</label>
                    <input type="number" className={inputCls} value={form.redBcIcms} onChange={e => f('redBcIcms', parseFloat(e.target.value) || 0)} step="0.01" />
                  </div>
                  <div>
                    <label className={labelCls}>Alíq. PIS (%)</label>
                    <input type="number" className={inputCls} value={form.aliqPis} onChange={e => f('aliqPis', parseFloat(e.target.value) || 0)} step="0.01" />
                  </div>
                  <div>
                    <label className={labelCls}>Alíq. COFINS (%)</label>
                    <input type="number" className={inputCls} value={form.aliqCofins} onChange={e => f('aliqCofins', parseFloat(e.target.value) || 0)} step="0.01" />
                  </div>
                  <div>
                    <label className={labelCls}>CST IPI</label>
                    <input className={`${inputCls} font-mono`} value={form.cstIpi || ''} onChange={e => f('cstIpi', e.target.value)} placeholder="Ex: 99" />
                  </div>
                  <div>
                    <label className={labelCls}>Alíq. IPI (%)</label>
                    <input type="number" className={inputCls} value={form.aliqIpi} onChange={e => f('aliqIpi', parseFloat(e.target.value) || 0)} step="0.01" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>CST ICMS (Regime Normal)</label>
                    <input className={`${inputCls} font-mono`} value={form.cstIcms || ''} onChange={e => f('cstIcms', e.target.value)} placeholder="Apenas para Lucro Presumido/Real" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => f('ativo', !form.ativo)}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${form.ativo ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.ativo ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-zinc-400">Grupo Ativo</span>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition active:scale-95 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {editing ? 'Salvar Alterações' : 'Criar Grupo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
