"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { getFullUrl } from "@/lib/getFullUrl";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ShieldCheck, Building2, User, Mail, Lock, Database, Loader2, CheckCircle2,
  AlertCircle, ArrowRight, Eye, EyeOff, Search, Edit, Image as ImageIcon,
  Settings, ToggleLeft, ToggleRight, AlertTriangle, Upload, X, Terminal,
  ChevronDown, ChevronRight, Trash2, DollarSign
} from "lucide-react";

const PIN_LENGTH = 10;

type Step = "pin" | "list" | "create" | "edit" | "success";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function SysInitPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("pin");

  // ── TENANT LIST ───────────────────────────────────────────────────────
  const [tenants, setTenants] = useState<any[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);

  // ── DATABASE MIGRATION STATE ──────────────────────────────────────────
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState<any[]>([]);
  const [activeLogTenantId, setActiveLogTenantId] = useState<string | null>(null);

  // ── PIN step ──────────────────────────────────────────────────────────
  const [pinDigits, setPinDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [pinError, setpinError] = useState("");
  const [pinShake, setPinShake] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Create Form step ──────────────────────────────────────────────────
  const [tenantName, setTenantName] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbNameManual, setDbNameManual] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [seedProducts, setSeedProducts] = useState(true);
  const [mensalidadeValor, setMensalidadeValor] = useState("0.00");
  const [mensalidadeVencimento, setMensalidadeVencimento] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // ── Edit Form step ────────────────────────────────────────────────────
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [editTab, setEditTab] = useState<"identidade" | "modulos" | "fiscal" | "mensalidade" | "integracoes">("identidade");
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  
  // Integração States
  const [integrationCreds, setIntegrationCreds] = useState<{clientId: string, clientSecret: string, merchantId: string, allowedCategories?: string[], priceMarkup?: number, syncStock?: boolean}>({ clientId: '', clientSecret: '', merchantId: '', allowedCategories: [], priceMarkup: 0, syncStock: false });
  const [tenantCategories, setTenantCategories] = useState<any[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [modulos, setModulos] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{message: string; synced: number; errors: number} | null>(null);

  const handleSyncCatalog = async () => {
    if (!editingTenant?.id) return;
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const pin = pinDigits.join('');
      
      // Auto-salva as credenciais antes de sincronizar
      await api.post(`/integrations/setup/${editingTenant.id}`, {
        provider: selectedIntegration,
        credentials: integrationCreds,
        settings: { active: true }
      }, {
        headers: { 'x-setup-pin': pin },
      });

      const res = await api.post(`/integrations/ifood/sync-catalog/${editingTenant.id}`, {}, {
        headers: { 'x-setup-pin': pin },
      });
      const data = res.data;
      setSyncResult(data);
      toast.success(`${data.synced} produto(s) sincronizados com o iFood!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Erro ao sincronizar catálogo');
    } finally {
      setSyncLoading(false);
    }
  };

  const loadTenants = async () => {
    setLoadingTenants(true);
    try {
      const pin = pinDigits.join('');
      const res = await api.get('/tenants/setup/list', {
        headers: { 'x-setup-pin': pin },
      });
      setTenants(res.data);
    } catch (err) {
      toast.error('Erro ao carregar tenants.');
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    if (step === "list") {
      loadTenants();
    }
  }, [step]);

  // Auto-fill dbName from tenantName
  useEffect(() => {
    if (!dbNameManual && tenantName) {
      setDbName(slugify(tenantName));
    }
  }, [tenantName, dbNameManual]);

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (pinDigits[index]) {
        const next = [...pinDigits];
        next[index] = "";
        setPinDigits(next);
      } else if (index > 0) {
        pinRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePinChange = (index: number, value: string) => {
    const char = value.slice(-1);
    const next = [...pinDigits];
    next[index] = char;
    setPinDigits(next);
    if (char && index < PIN_LENGTH - 1) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").slice(0, PIN_LENGTH);
    const next = Array(PIN_LENGTH).fill("");
    pasted.split("").forEach((c, i) => (next[i] = c));
    setPinDigits(next);
    pinRefs.current[Math.min(pasted.length, PIN_LENGTH - 1)]?.focus();
  };

  const triggerShake = () => {
    setPinShake(true);
    setTimeout(() => setPinShake(false), 600);
  };

  const handleValidatePin = async () => {
    const pin = pinDigits.join("");
    if (pin.length < PIN_LENGTH) {
      setpinError("Digite todos os caracteres do PIN.");
      triggerShake();
      return;
    }
    setPinLoading(true);
    setpinError("");
    try {
      await api.post("/tenants/setup/validate-pin", { pin });
      setTimeout(() => setStep("list"), 300);
    } catch {
      setpinError("PIN incorreto. Acesso negado.");
      triggerShake();
      setPinDigits(Array(PIN_LENGTH).fill(""));
      pinRefs.current[0]?.focus();
    } finally {
      setPinLoading(false);
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (adminPassword !== adminPasswordConfirm) {
      setFormError("As senhas não coincidem.");
      return;
    }
    if (adminPassword.length < 6) {
      setFormError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setFormLoading(true);
    try {
      const pin = pinDigits.join("");
      const { data } = await api.post("/tenants/setup", {
        pin,
        tenantName,
        dbName,
        adminName,
        adminEmail,
        adminPassword,
        seedProducts,
        mensalidadeValor: Number(mensalidadeValor) || 0,
        mensalidadeVencimento: mensalidadeVencimento || null,
      });
      setSuccessData(data);
      setStep("success");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erro ao provisionar. Tente novamente.";
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (tenant: any) => {
    setEditingTenant(tenant);
    setLogoFile(null);
    let parsedModulos = { nfce: true, estoque: true, dashboardMobile: true };
    try {
      if (tenant.modulos) {
        parsedModulos = typeof tenant.modulos === 'string' ? JSON.parse(tenant.modulos) : tenant.modulos;
      }
    } catch (e) {
      console.error("Erro ao fazer parse dos módulos:", e);
    }
    setModulos(parsedModulos);
    setEditTab("identidade");
    setStep("edit");
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      const pin = pinDigits.join('');
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        await api.post(`/tenants/setup/${editingTenant.id}/logo`, formData, {
          headers: { 'x-setup-pin': pin },
        });
      }
      
      await api.patch(`/tenants/setup/${editingTenant.id}`, {
        nomeFantasia: editingTenant.nomeFantasia,
        razaoSocial: editingTenant.razaoSocial,
        cnpj: editingTenant.cnpj,
        status: editingTenant.status,
        nfceAmbiente: editingTenant.nfceAmbiente,
        modulos,
        mensalidadeValor: Number(editingTenant.mensalidadeValor) || 0,
        mensalidadeVencimento: editingTenant.mensalidadeVencimento || null,
      }, {
        headers: { 'x-setup-pin': pin },
      });
      
      toast.success("Tenant atualizado com sucesso!");
      setLogoFile(null);
      setStep("list");
      loadTenants(); // Recarrega a lista para refletir alterações
    } catch (err: any) {
      console.error(err.response?.data || err);
      toast.error(err.response?.data?.message || "Erro ao salvar alterações.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveIntegration = async () => {
    setEditLoading(true);
    try {
      const pin = pinDigits.join('');
      await api.post(`/integrations/setup/${editingTenant.id}`, {
        provider: selectedIntegration,
        credentials: integrationCreds,
        settings: { active: true }
      }, {
        headers: { 'x-setup-pin': pin },
      });
      toast.success("Integração salva com sucesso!");
      setSelectedIntegration(null);
      loadTenants(); // Recarrega para obter as integrações recém-salvas
      setEditingTenant(null); // Fecha o modal
      setStep("list");
    } catch (err: any) {
      console.error(err.response?.data || err);
      toast.error(err.response?.data?.message || "Erro ao salvar integração.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteTenant = async (tenant: any) => {
    const confirmName = window.prompt(
      `ATENÇÃO: Isso excluirá PERMANENTEMENTE o banco de dados "${tenant.databaseName}" e todos os registros da empresa "${tenant.name || tenant.nomeFantasia}".\n\nEsta operação NÃO PODE SER DESFEITA.\n\nPara confirmar, digite o nome do banco de dados (${tenant.databaseName}):`
    );
    
    if (confirmName !== tenant.databaseName) {
      if (confirmName !== null) {
        toast.error("Confirmação incorreta. A exclusão foi cancelada.");
      }
      return;
    }

    try {
      const pin = pinDigits.join('');
      await api.delete(`/tenants/setup/${tenant.id}`, {
        headers: { 'x-setup-pin': pin },
      });
      toast.success("Tenant e banco de dados excluídos com sucesso!");
      loadTenants();
    } catch (err: any) {
      console.error(err.response?.data || err);
      toast.error(err.response?.data?.message || "Erro ao excluir tenant.");
    }
  };

  const handleRegistrarPagamento = async (tenantId: string) => {
    try {
      const pin = pinDigits.join('');
      await api.post(`/tenants/setup/${tenantId}/registrar-pagamento`, {}, {
        headers: { 'x-setup-pin': pin },
      });
      toast.success("Pagamento registrado e vencimento avançado em 1 mês!");
      loadTenants();
    } catch (err: any) {
      console.error(err.response?.data || err);
      toast.error(err.response?.data?.message || "Erro ao registrar pagamento.");
    }
  };

  const handleMigrateBancos = async () => {
    setMigrationModalOpen(true);
    setMigrating(true);
    setMigrationResults(selectedTenantIds.map(id => {
      const tenant = tenants.find(t => t.id === id);
      return {
        tenantId: id,
        name: tenant?.name || tenant?.nomeFantasia || 'Tenant',
        databaseName: tenant?.databaseName || '',
        status: 'processing',
        output: ''
      };
    }));
    
    try {
      const pin = pinDigits.join('');
      const res = await api.post('/tenants/setup/migrate', {
        tenantIds: selectedTenantIds
      }, {
        headers: { 'x-setup-pin': pin },
      });
      
      setMigrationResults(res.data);
      toast.success('Migração de bancos concluída!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao executar migração.';
      toast.error(msg);
      setMigrationResults(prev => prev.map(item => 
        item.status === 'processing' ? { ...item, status: 'error', output: msg } : item
      ));
    } finally {
      setMigrating(false);
      setSelectedTenantIds([]);
      loadTenants();
    }
  };

  const isCertExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expDate = new Date(date);
    const diff = expDate.getTime() - new Date().getTime();
    return diff < 30 * 24 * 60 * 60 * 1000 && diff > 0;
  };

  const filteredTenants = tenants.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.cnpj?.includes(searchTerm) ||
    t.databaseName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const faturamentoEstimado = tenants
    .filter(t => t.status === 'active')
    .reduce((acc, t) => acc + (Number(t.mensalidadeValor) || 0), 0);

  const mensalidadesAtrasadas = tenants.filter(t => {
    if (!t.mensalidadeVencimento || t.status !== 'active') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const venc = new Date(t.mensalidadeVencimento);
    return venc < today;
  }).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col p-6">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-700 rounded-full blur-[140px] opacity-20" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[160px] opacity-15" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full flex-1 flex flex-col">
        {step === "pin" && (
          <div className={`transition-all duration-300 max-w-md mx-auto mt-20 ${pinShake ? "animate-[shake_0.4s_ease]" : ""}`}>
            <div className="p-8 rounded-3xl bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 shadow-2xl">
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                  <ShieldCheck size={30} className="text-violet-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Painel Central</h1>
                <p className="text-zinc-400 text-sm mt-2 text-center">
                  Digite o PIN de administração para acessar o gerenciador de Tenants
                </p>
              </div>

              <div className="mb-6">
                <div className="flex gap-2 justify-center" onPaste={handlePinPaste}>
                  {pinDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { pinRefs.current[i] = el; }}
                      type="password"
                      maxLength={2}
                      value={digit}
                      onChange={(e) => handlePinChange(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      className={`w-9 h-11 text-center text-lg font-bold rounded-xl border transition-all outline-none
                        ${digit ? "bg-violet-600/20 border-violet-500/60 text-white" : "bg-zinc-950/50 border-zinc-700 text-white"}
                        focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30`}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
              </div>

              {pinError && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={16} /> {pinError}
                </div>
              )}

              <button
                onClick={handleValidatePin}
                disabled={pinLoading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-violet-600/25 active:scale-95 flex justify-center items-center gap-2"
              >
                {pinLoading ? <Loader2 className="animate-spin" size={20} /> : <>Acessar Painel <ArrowRight size={18} /></>}
              </button>
            </div>
          </div>
        )}

        {step === "list" && (
          <div className="animate-[fadeIn_0.3s_ease] flex flex-col flex-1">
            <div className="flex justify-between items-center mb-8 mt-4">
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent">Gestão de Tenants</h1>
                <p className="text-zinc-400 mt-1">Gerencie os clientes SaaS, módulos e identidades visuais.</p>
              </div>
              
              <div className="flex gap-3">
                {selectedTenantIds.length > 0 && (
                  <button onClick={handleMigrateBancos} className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-violet-500/20">
                    <Database size={18} /> Atualizar Bancos ({selectedTenantIds.length})
                  </button>
                )}
                <button onClick={() => setStep("create")} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-500/20">
                  <Building2 size={18} /> Novo Tenant
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl"><Building2 size={24} /></div>
                <div><p className="text-zinc-400 text-sm">Total de Clientes</p><p className="text-2xl font-bold">{tenants.length}</p></div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><DollarSign size={24} /></div>
                <div>
                  <p className="text-zinc-400 text-sm">Faturamento Mensal</p>
                  <p className="text-2xl font-bold">R$ {faturamentoEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl"><AlertTriangle size={24} /></div>
                <div>
                  <p className="text-zinc-400 text-sm">Atrasados</p>
                  <p className="text-2xl font-bold text-rose-400">{mensalidadesAtrasadas}</p>
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl"><AlertTriangle size={24} /></div>
                <div>
                  <p className="text-zinc-400 text-sm">Certificados a Vencer</p>
                  <p className="text-2xl font-bold">{tenants.filter(t => isCertExpiringSoon(t.certValidade)).length}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input type="text" placeholder="Buscar por nome ou CNPJ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-violet-500" />
                </div>
              </div>
              
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-zinc-950/50 text-zinc-400 sticky top-0 z-10 border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 font-medium w-12">
                        <input
                          type="checkbox"
                          checked={filteredTenants.length > 0 && selectedTenantIds.length === filteredTenants.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTenantIds(filteredTenants.map(t => t.id));
                            } else {
                              setSelectedTenantIds([]);
                            }
                          }}
                          className="rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
                        />
                      </th>
                      <th className="px-6 py-4 font-medium">Tenant</th>
                      <th className="px-6 py-4 font-medium">Banco / CNPJ</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Mensalidade</th>
                      <th className="px-6 py-4 font-medium">Módulos</th>
                      <th className="px-6 py-4 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {loadingTenants ? (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-500"><Loader2 className="animate-spin inline-block mr-2" /> Carregando...</td></tr>
                    ) : filteredTenants.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-500">Nenhum tenant encontrado.</td></tr>
                    ) : (
                      filteredTenants.map(t => {
                        const isSelected = selectedTenantIds.includes(t.id);
                        return (
                          <tr key={t.id} className={`hover:bg-zinc-800/30 transition ${isSelected ? 'bg-violet-950/10' : ''}`}>
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTenantIds(prev => [...prev, t.id]);
                                  } else {
                                    setSelectedTenantIds(prev => prev.filter(id => id !== t.id));
                                  }
                                }}
                                className="rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {t.logoUrl ? (
                                  <img src={getFullUrl(t.logoUrl)} alt="Logo" className="w-8 h-8 rounded object-cover bg-zinc-950" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold">{t.name?.charAt(0).toUpperCase()}</div>
                                )}
                                <div>
                                  <p className="font-semibold text-zinc-200">{t.name || t.nomeFantasia}</p>
                                  <p className="text-xs text-zinc-500">
                                    {t.users?.find((u: any) => u.role === 'admin')?.email || t.users?.[0]?.email || 'Sem admin'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-mono text-zinc-300">{t.databaseName}</p>
                              <p className="text-xs text-zinc-500">{t.cnpj || 'CNPJ não informado'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${t.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {t.status === 'active' ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-semibold text-zinc-200">
                                  R$ {Number(t.mensalidadeValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                {t.mensalidadeVencimento ? (() => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const venc = new Date(t.mensalidadeVencimento);
                                  const diffTime = venc.getTime() - today.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  
                                  let color = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                                  let statusText = `Vence em ${venc.toLocaleDateString("pt-BR")}`;
                                  
                                  if (diffDays < 0) {
                                    color = "text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse";
                                    statusText = `Atrasado desde ${venc.toLocaleDateString("pt-BR")}`;
                                  } else if (diffDays <= 5) {
                                    color = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                                    statusText = diffDays === 0 ? "Vence hoje!" : `Vence em ${diffDays} dias`;
                                  }

                                  return (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${color} block w-max mt-1`}>
                                      {statusText}
                                    </span>
                                  );
                                })() : (
                                  <span className="text-zinc-500 text-xs">Sem vencimento</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1">
                                {(() => {
                                  let m = { nfce: true, estoque: true, dashboardMobile: true };
                                  try {
                                    if (t.modulos) {
                                      m = typeof t.modulos === 'string' ? JSON.parse(t.modulos) : t.modulos;
                                    }
                                  } catch (e) {
                                    console.error("Erro ao renderizar módulos do tenant:", e);
                                  }
                                  return (
                                    <>
                                      <span className={`w-2 h-2 rounded-full ${m.nfce ? 'bg-blue-500' : 'bg-zinc-700'}`} title="NFC-e" />
                                      <span className={`w-2 h-2 rounded-full ${m.estoque ? 'bg-indigo-500' : 'bg-zinc-700'}`} title="Estoque" />
                                      <span className={`w-2 h-2 rounded-full ${m.dashboardMobile ? 'bg-violet-500' : 'bg-zinc-700'}`} title="App Mobile" />
                                    </>
                                  )
                                })()}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => handleRegistrarPagamento(t.id)} className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition" title="Registrar Pagamento">
                                  <DollarSign size={18} />
                                </button>
                                <button onClick={() => openEdit(t)} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition" title="Editar">
                                  <Edit size={18} />
                                </button>
                                <button onClick={() => handleDeleteTenant(t)} className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition" title="Excluir">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {step === "create" && (
           <div className="max-w-md mx-auto mt-20 animate-[fadeIn_0.4s_ease]">
              <button onClick={() => setStep("list")} className="mb-4 text-zinc-400 hover:text-white flex items-center gap-2 text-sm"><ArrowRight className="rotate-180" size={16} /> Voltar para lista</button>
             <div className="p-8 rounded-3xl bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 shadow-2xl">
               <h1 className="text-2xl font-bold tracking-tight mb-6">Novo Tenant</h1>
               <form onSubmit={handleProvision} className="space-y-4">
                 <div><label className="text-xs text-zinc-400 uppercase">Empresa</label><input required value={tenantName} onChange={e => setTenantName(e.target.value)} className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl mt-1 text-white" /></div>
                 <div><label className="text-xs text-zinc-400 uppercase">Banco (gerado)</label><input required value={dbName} onChange={e => {setDbName(e.target.value); setDbNameManual(true);}} className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl mt-1 text-white font-mono text-sm" /></div>
                 <div><label className="text-xs text-zinc-400 uppercase">Admin Nome</label><input required value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl mt-1 text-white" /></div>
                 <div><label className="text-xs text-zinc-400 uppercase">Admin Email</label><input type="email" required value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl mt-1 text-white" /></div>
                 <div><label className="text-xs text-zinc-400 uppercase">Senha</label><input type="password" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl mt-1 text-white" /></div>
                 <div><label className="text-xs text-zinc-400 uppercase">Confirmar Senha</label><input type="password" required value={adminPasswordConfirm} onChange={e => setAdminPasswordConfirm(e.target.value)} className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl mt-1 text-white" /></div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs text-zinc-400 uppercase">Mensalidade (R$)</label>
                     <input type="number" step="0.01" value={mensalidadeValor} onChange={e => setMensalidadeValor(e.target.value)} className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl mt-1 text-white" />
                   </div>
                   <div>
                     <label className="text-xs text-zinc-400 uppercase">1º Vencimento</label>
                     <input type="date" value={mensalidadeVencimento} onChange={e => setMensalidadeVencimento(e.target.value)} className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl mt-1 text-white" />
                   </div>
                 </div>
                 <div className="flex items-center gap-3 mt-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                   <button type="button" onClick={() => setSeedProducts(!seedProducts)} className={`transition-colors ${seedProducts ? 'text-emerald-500' : 'text-zinc-600'}`}>
                     {seedProducts ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                   </button>
                   <div>
                     <p className="text-sm font-semibold text-zinc-200">Produtos Base</p>
                     <p className="text-xs text-zinc-500">Popular banco de dados com produtos padrão ao provisionar.</p>
                   </div>
                 </div>
                 {formError && <div className="text-red-400 text-sm">{formError}</div>}
                 <button type="submit" disabled={formLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-4">
                   {formLoading ? <Loader2 className="animate-spin mx-auto" /> : "Provisionar"}
                 </button>
               </form>
             </div>
           </div>
        )}

        {step === "edit" && editingTenant && (
           <div className="max-w-2xl mx-auto mt-10 animate-[fadeIn_0.3s_ease] w-full">
             <button onClick={() => setStep("list")} className="mb-4 text-zinc-400 hover:text-white flex items-center gap-2 text-sm"><ArrowRight className="rotate-180" size={16} /> Voltar para lista</button>
             <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
               <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                 <h2 className="text-xl font-bold flex items-center gap-3">
                   <Settings className="text-violet-500" />
                   Configurações: {editingTenant.name || editingTenant.nomeFantasia}
                 </h2>
                 <span className="text-xs font-mono text-zinc-500">{editingTenant.databaseName}</span>
               </div>
               
               <div className="flex border-b border-zinc-800 bg-zinc-950/50">
                 <button onClick={() => setEditTab("identidade")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${editTab === 'identidade' ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}>Identidade</button>
                 <button onClick={() => setEditTab("modulos")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${editTab === 'modulos' ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}>Módulos</button>
                 <button onClick={() => setEditTab("fiscal")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${editTab === 'fiscal' ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}>Fiscal</button>
                 <button onClick={() => { setEditTab("mensalidade"); setSelectedIntegration(null); }} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${editTab === 'mensalidade' ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}>Mensalidade</button>
                 <button onClick={() => { setEditTab("integracoes"); setSelectedIntegration(null); }} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${editTab === 'integracoes' ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}>Integrações</button>
               </div>

               <div className="p-6 flex-1">
                 {editTab === 'identidade' && (
                   <div className="space-y-5">
                     <div>
                       <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">Logotipo (White Label)</label>
                       <div className="flex items-center gap-4">
                         <div className="w-20 h-20 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center overflow-hidden">
                           {logoFile ? (
                             <img src={URL.createObjectURL(logoFile)} alt="Preview" className="w-full h-full object-cover" />
                           ) : editingTenant.logoUrl ? (
                             <img src={getFullUrl(editingTenant.logoUrl)} alt="Logo" className="w-full h-full object-contain p-1" />
                           ) : (
                             <ImageIcon size={30} className="text-zinc-700" />
                           )}
                         </div>
                         <div className="flex-1">
                           <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl cursor-pointer transition text-sm flex items-center gap-2 w-max">
                             <Upload size={16} /> Fazer Upload
                             <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setLogoFile(e.target.files[0])} />
                           </label>
                           <p className="text-xs text-zinc-500 mt-2">Recomendado: PNG ou SVG transparente, proporção horizontal.</p>
                         </div>
                       </div>
                     </div>
                     <div>
                       <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">Nome Fantasia (Exibição)</label>
                       <input type="text" value={editingTenant.nomeFantasia || editingTenant.name || ''} onChange={e => setEditingTenant({...editingTenant, nomeFantasia: e.target.value})} className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none" />
                     </div>
                     <div>
                       <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">Status</label>
                       <select value={editingTenant.status} onChange={e => setEditingTenant({...editingTenant, status: e.target.value})} className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none">
                         <option value="active">Ativo</option>
                         <option value="inactive">Inativo</option>
                         <option value="suspended">Suspenso</option>
                       </select>
                     </div>
                   </div>
                 )}

                 {editTab === 'modulos' && (
                   <div className="space-y-4">
                     <p className="text-zinc-400 text-sm mb-4">Habilite ou desabilite os recursos (Feature Flags) para este cliente.</p>
                     {['nfce', 'estoque', 'dashboardMobile'].map(mod => (
                       <div key={mod} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                         <div>
                           <p className="font-semibold text-zinc-200 capitalize">{mod === 'nfce' ? 'NFC-e / Fiscal' : mod === 'dashboardMobile' ? 'Dashboard Mobile' : mod === 'estoque' ? 'Estoque' : mod}</p>
                           <p className="text-xs text-zinc-500">Permite o acesso a este módulo no sistema.</p>
                         </div>
                         <button onClick={() => setModulos({...modulos, [mod]: !modulos[mod]})} className={`transition-colors ${modulos[mod] ? 'text-violet-500' : 'text-zinc-600'}`}>
                           {modulos[mod] ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                         </button>
                       </div>
                     ))}
                   </div>
                 )}

                 {editTab === 'fiscal' && (
                   <div className="space-y-5">
                     <p className="text-sm text-zinc-400 border-b border-zinc-800 pb-3">Estes dados serão injetados no motor fiscal.</p>
                     <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-xs text-zinc-400 uppercase">CNPJ</label><input type="text" value={editingTenant.cnpj || ''} onChange={e => setEditingTenant({...editingTenant, cnpj: e.target.value})} className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm" /></div>
                       <div><label className="text-xs text-zinc-400 uppercase">Ambiente NFC-e</label><select value={editingTenant.nfceAmbiente || 2} onChange={e => setEditingTenant({...editingTenant, nfceAmbiente: Number(e.target.value)})} className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm"><option value={1}>1 - Produção</option><option value={2}>2 - Homologação</option></select></div>
                     </div>
                   </div>
                 )}

                 {editTab === 'mensalidade' && (
                   <div className="space-y-4">
                     <p className="text-sm text-zinc-400 mb-2">Configure o valor e a data do próximo vencimento da mensalidade deste cliente.</p>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                                  <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">Valor (R$)</label>
                         <input type="number" step="0.01" value={editingTenant.mensalidadeValor || ''} onChange={e => setEditingTenant({...editingTenant, mensalidadeValor: e.target.value})} className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none" />
                       </div>
                       <div>
                         <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">Próximo Vencimento</label>
                         <input type="date" value={editingTenant.mensalidadeVencimento ? new Date(editingTenant.mensalidadeVencimento).toISOString().split('T')[0] : ''} onChange={e => setEditingTenant({...editingTenant, mensalidadeVencimento: e.target.value ? new Date(e.target.value).toISOString() : null})} className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none" />
                       </div>
                     </div>
                   </div>
                 )}

                 {editTab === 'integracoes' && (
                   <div className="space-y-4">
                     {!selectedIntegration ? (
                       <>
                         <p className="text-sm text-zinc-400 mb-2">Selecione o provedor para configurar a integração deste cliente.</p>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {/* iFood Card */}
                           <button onClick={async () => {
                             const existing = editingTenant?.tenantIntegrations?.find((i: any) => i.provider === 'ifood');
                             if (existing && existing.credentials) {
                               setIntegrationCreds({ 
                                 ...existing.credentials, 
                                 allowedCategories: existing.credentials.allowedCategories || [],
                                 priceMarkup: existing.credentials.priceMarkup || 0,
                                 syncStock: existing.credentials.syncStock || false
                               });
                             } else {
                               setIntegrationCreds({ clientId: '', clientSecret: '', merchantId: '', allowedCategories: [], priceMarkup: 0, syncStock: false });
                             }
                             
                             try {
                               const pin = pinDigits.join('');
                               const res = await api.get(`/tenants/setup/${editingTenant.id}/categories`, {
                                 headers: { 'x-setup-pin': pin }
                               });
                               setTenantCategories(res.data);
                             } catch (e) {
                               console.error("Erro ao buscar categorias do tenant:", e);
                             }

                             setSelectedIntegration('ifood');
                           }} className="bg-zinc-950 border border-zinc-800 hover:border-red-500/50 rounded-2xl p-5 flex items-center gap-4 transition-colors group text-left">
                             <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-105 transition-transform">iFood</div>
                             <div>
                               <h3 className="font-bold text-white">Integração iFood</h3>
                               <p className="text-xs text-zinc-400 mt-1">Conectar ao portal do parceiro</p>
                             </div>
                           </button>

                           {/* Outros Cards (Em breve) */}
                           <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5 flex items-center gap-4 opacity-50 cursor-not-allowed">
                             <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">Rappi</div>
                             <div>
                               <h3 className="font-bold text-white">Integração Rappi</h3>
                               <p className="text-xs text-zinc-400 mt-1">Em breve</p>
                             </div>
                           </div>

                           <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5 flex items-center gap-4 opacity-50 cursor-not-allowed">
                             <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">Wpp</div>
                             <div>
                               <h3 className="font-bold text-white">WhatsApp Bot</h3>
                               <p className="text-xs text-zinc-400 mt-1">Em breve</p>
                             </div>
                           </div>
                         </div>
                       </>
                     ) : selectedIntegration === 'ifood' ? (
                       <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
                         <div className="flex items-center gap-4 mb-4">
                           <button onClick={() => setSelectedIntegration(null)} className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors">
                             <ArrowRight className="rotate-180" size={20} />
                           </button>
                           <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">iFood</div>
                           <div>
                             <h3 className="font-bold text-white text-lg">Integração iFood</h3>
                             <p className="text-xs text-zinc-400">Insira as chaves de API do cliente</p>
                           </div>
                         </div>
                         <div className="space-y-3">
                           <div>
                             <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1 block">Client ID</label>
                             <input type="text" value={integrationCreds.clientId} onChange={e => setIntegrationCreds({...integrationCreds, clientId: e.target.value})} placeholder="Cole o Client ID" className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-red-500 outline-none text-sm" />
                           </div>
                           <div>
                             <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1 block">Client Secret</label>
                             <input type="password" value={integrationCreds.clientSecret} onChange={e => setIntegrationCreds({...integrationCreds, clientSecret: e.target.value})} placeholder="Cole o Client Secret" className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-red-500 outline-none text-sm" />
                           </div>
                           <div>
                             <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1 block">Merchant ID</label>
                             <input type="text" value={integrationCreds.merchantId} onChange={e => setIntegrationCreds({...integrationCreds, merchantId: e.target.value})} placeholder="Cole o ID da Loja (Merchant)" className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-red-500 outline-none text-sm" />
                           </div>
                           <button disabled={editLoading} onClick={handleSaveIntegration} className="w-full mt-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
                             {editLoading ? 'Salvando...' : 'Conectar ao iFood'}
                           </button>

                           {/* Separator */}
                           <div className="border-t border-zinc-800 my-4" />
                           
                           {/* Markup and Stock Sync Settings */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                             <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                               <label className="text-sm font-bold text-white block mb-1">Acréscimo de Preço (%)</label>
                               <p className="text-xs text-zinc-400 mb-3">Compensa taxas adicionando uma margem ao preço do PDV.</p>
                               <div className="relative">
                                 <input 
                                   type="number" 
                                   value={integrationCreds.priceMarkup || 0} 
                                   onChange={e => setIntegrationCreds({...integrationCreds, priceMarkup: Number(e.target.value)})} 
                                   className="w-full p-2.5 pl-4 pr-8 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm focus:border-red-500 outline-none"
                                 />
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                               </div>
                             </div>
                             
                             <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                               <div className="flex items-start justify-between">
                                 <div>
                                   <p className="text-sm font-bold text-white">Sincronizar Estoque</p>
                                   <p className="text-xs text-zinc-400 mt-1">Atualizar estoque do iFood automaticamente com as vendas do PDV.</p>
                                 </div>
                                 <button onClick={() => setIntegrationCreds({...integrationCreds, syncStock: !integrationCreds.syncStock})} className={`transition-colors mt-1 ${integrationCreds.syncStock ? 'text-red-500' : 'text-zinc-600'}`}>
                                   {integrationCreds.syncStock ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                                 </button>
                               </div>
                             </div>
                           </div>

                           {/* Category Filter */}
                           <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-3">
                             <div className="mb-3">
                               <p className="text-sm font-bold text-white">Filtro de Categorias</p>
                               <p className="text-xs text-zinc-400">Selecione as categorias que deseja enviar para o iFood. Se nenhuma for selecionada, nenhum produto será sincronizado.</p>
                             </div>
                             <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                               {tenantCategories.map(cat => {
                                 const isChecked = integrationCreds.allowedCategories?.includes(cat.id) ?? false;
                                 return (
                                   <label key={cat.id} className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer hover:bg-zinc-800/80 p-2 rounded-lg transition-colors">
                                     <input 
                                       type="checkbox" 
                                       checked={isChecked}
                                       onChange={(e) => {
                                         const current = integrationCreds.allowedCategories || [];
                                         const next = e.target.checked 
                                           ? [...current, cat.id] 
                                           : current.filter(id => id !== cat.id);
                                         setIntegrationCreds({ ...integrationCreds, allowedCategories: next });
                                       }}
                                       className="rounded border-zinc-700 text-red-600 focus:ring-red-600 bg-zinc-950 w-4 h-4 cursor-pointer"
                                     />
                                     {cat.name}
                                   </label>
                                 );
                               })}
                               {tenantCategories.length === 0 && (
                                 <p className="text-xs text-zinc-500 italic p-2">Nenhuma categoria encontrada.</p>
                               )}
                             </div>
                           </div>

                           {/* Catalog Sync */}
                           <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                             <div className="flex items-center justify-between mb-2">
                               <div>
                                 <p className="text-sm font-bold text-white">Sincronizar Catálogo</p>
                                 <p className="text-xs text-zinc-400">Envia todos os produtos ativos para o iFood com externalCode vinculado</p>
                               </div>
                             </div>
                             <button
                               disabled={syncLoading}
                               onClick={handleSyncCatalog}
                               className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                             >
                               {syncLoading ? <><Loader2 className="animate-spin" size={16} /> Sincronizando...</> : '🔄 Sincronizar Produtos → iFood'}
                             </button>
                             {syncResult && (
                               <div className={`mt-3 p-3 rounded-lg text-xs ${syncResult.errors > 0 ? 'bg-yellow-900/30 border border-yellow-700 text-yellow-300' : 'bg-green-900/30 border border-green-700 text-green-300'}`}>
                                 <p className="font-bold mb-1">{syncResult.errors > 0 ? '⚠️ Concluído com erros' : '✅ Sincronização concluída'}</p>
                                 <p>{syncResult.message}</p>
                               </div>
                             )}
                           </div>
                         </div>
                       </div>
                     ) : null}
                   </div>
                 )}
               </div>

               <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
                 <button onClick={() => setStep("list")} className="px-5 py-2.5 rounded-xl font-medium text-zinc-400 hover:text-white transition">Cancelar</button>
                 <button onClick={handleSaveEdit} disabled={editLoading} className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition">
                   {editLoading ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Alterações'}
                 </button>
               </div>
             </div>
           </div>
        )}

        {step === "success" && successData && (
           <div className="max-w-md mx-auto mt-20 animate-[fadeIn_0.5s_ease] text-center">
             <div className="p-8 rounded-3xl bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 shadow-2xl">
               <CheckCircle2 size={50} className="text-emerald-400 mx-auto mb-4" />
               <h1 className="text-2xl font-bold mb-2">Tenant Criado!</h1>
               <p className="text-zinc-400 text-sm mb-6">{successData.tenant?.name} pronto para uso.</p>
               <button onClick={() => { setStep("list"); loadTenants(); }} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl">Voltar para o Painel</button>
             </div>
           </div>
        )}

        {/* MODAL MIGRACAO DE BANCO DE DADOS */}
        {migrationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-violet-400">
                    <Database size={20} />
                    Migração de Bancos de Dados
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">Atualizando estrutura e schemas do Prisma nos tenants selecionados</p>
                </div>
                {!migrating && (
                  <button 
                    onClick={() => {
                      setMigrationModalOpen(false);
                      setMigrationResults([]);
                      setActiveLogTenantId(null);
                    }}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="space-y-2">
                  {migrationResults.map((result) => {
                    const isActiveLog = activeLogTenantId === result.tenantId;
                    return (
                      <div key={result.tenantId} className="border border-zinc-800 bg-zinc-950/40 rounded-xl overflow-hidden transition">
                        <div 
                          onClick={() => result.output && setActiveLogTenantId(isActiveLog ? null : result.tenantId)}
                          className={`p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800/20 transition`}
                        >
                          <div className="flex items-center gap-3">
                            {result.status === 'processing' && <Loader2 className="animate-spin text-violet-400" size={18} />}
                            {result.status === 'success' && <CheckCircle2 className="text-emerald-400" size={18} />}
                            {result.status === 'error' && <AlertCircle className="text-red-400" size={18} />}
                            <div>
                              <p className="font-semibold text-sm text-zinc-200">{result.name}</p>
                              <p className="text-xs text-zinc-500">Banco: {result.databaseName || '-'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${
                              result.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              result.status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}>
                              {result.status === 'success' ? 'Sucesso' :
                               result.status === 'error' ? 'Falhou' : 'Processando...'}
                            </span>
                            {result.output && (
                              <span className="text-zinc-500">
                                {isActiveLog ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </span>
                            )}
                          </div>
                        </div>

                        {isActiveLog && result.output && (
                          <div className="px-4 pb-4 border-t border-zinc-800 bg-zinc-950">
                            <div className="flex items-center gap-2 py-2 text-xs font-mono text-zinc-400 border-b border-zinc-900 mb-2">
                              <Terminal size={12} />
                              <span>Console Log</span>
                            </div>
                            <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 custom-scrollbar">
                              {result.output}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
                <button
                  disabled={migrating}
                  onClick={() => {
                    setMigrationModalOpen(false);
                    setMigrationResults([]);
                    setActiveLogTenantId(null);
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold transition animate-[fadeIn_0.2s_ease]"
                >
                  {migrating ? 'Migrando bancos...' : 'Fechar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
