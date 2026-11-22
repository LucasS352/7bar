import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';

const api = axios.create({ baseURL: '/api' });

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  credit_card: 'Cartão de Crédito',
  bank_transfer: 'Transferência',
  cash: 'Dinheiro',
};

const OUTBOX_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  PROCESSING: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  DELIVERED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  FAILED_ACTION_REQUIRED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  DEAD_LETTER: 'bg-red-950 text-red-300 border-red-500/40',
};

function sanitizeCsv(v: unknown): string {
  const raw = String(v ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function formatCents(cents: number | null | undefined) {
  return (Number(cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function LeadgerPanel({
  pin,
  onOpenMigrationHeart,
}: {
  pin: string;
  onOpenMigrationHeart: () => void;
}) {
  const [subTab, setSubTab] = useState<'outbox' | 'clients' | 'reconciliation'>('outbox');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [outbox, setOutbox] = useState<{ counts: Record<string, number>; items: any[] }>({
    counts: {},
    items: [],
  });
  const [outboxFilter, setOutboxFilter] = useState('ALL');
  const [clients, setClients] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [expandedJsonId, setExpandedJsonId] = useState<string | null>(null);

  // Novo cliente pagador
  const [newClient, setNewClient] = useState({ name: '', document: '', email: '', phone: '', notes: '' });
  const [creatingClient, setCreatingClient] = useState(false);
  const [syncingBatch, setSyncingBatch] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'x-setup-pin': pin };
      const stRes = await api.get('/tenants/setup/leadger/status', { headers });
      setStatus(stRes.data);

      if (!stRes.data?.tablesReady) {
        return;
      }

      const [outRes, cliRes, recRes] = await Promise.all([
        api.get('/tenants/setup/leadger/outbox', { params: { status: outboxFilter }, headers }),
        api.get('/tenants/setup/leadger/clients', { headers }),
        api.get('/tenants/setup/leadger/reconciliation', { headers }),
      ]);
      setOutbox(outRes.data || { counts: {}, items: [] });
      setClients(cliRes.data || []);
      setReconciliation(recRes.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao carregar status do Leadger.');
    } finally {
      setLoading(false);
    }
  }, [pin, outboxFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name.trim()) return;
    setCreatingClient(true);
    try {
      await api.post('/tenants/setup/leadger/clients', newClient, { headers: { 'x-setup-pin': pin } });
      toast.success('Cliente pagador criado com sucesso!');
      setNewClient({ name: '', document: '', email: '', phone: '', notes: '' });
      await loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar cliente pagador.');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleRetryEvent = async (id: string) => {
    try {
      await api.post(`/tenants/setup/leadger/outbox/${id}/retry`, {}, { headers: { 'x-setup-pin': pin } });
      toast.success('Evento recolocado na fila para reenvio!');
      await loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao reenviar evento.');
    }
  };

  const handleProcessNow = async () => {
    setProcessingQueue(true);
    try {
      const res = await api.post('/tenants/setup/leadger/outbox/process-now', {}, { headers: { 'x-setup-pin': pin } });
      const d = res.data || {};
      toast.success(`Fila processada: ${d.delivered ?? 0} entregues de ${d.processed ?? 0} (${d.deferred ?? 0} aguardando base).`);
      await loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Não foi possível processar a fila.');
    } finally {
      setProcessingQueue(false);
    }
  };

  const handleBatchSync = async () => {
    if (selectedTenantIds.length === 0) return;
    if (
      !window.confirm(
        `Deseja habilitar a sincronização com o Leadger e enfileirar o snapshot inicial de ${selectedTenantIds.length} loja(s)? Certifique-se de que já estão conciliadas.`,
      )
    ) {
      return;
    }
    setSyncingBatch(true);
    try {
      const res = await api.post(
        '/tenants/setup/leadger/batch-sync',
        { tenantIds: selectedTenantIds },
        { headers: { 'x-setup-pin': pin } },
      );
      const list = res.data || [];
      const okCount = list.filter((r: any) => r.status === 'enqueued').length;
      const errCount = list.length - okCount;
      toast.success(`${okCount} base(s) enfileirada(s)${errCount > 0 ? `, ${errCount} com erro` : ''}.`);
      setSelectedTenantIds([]);
      await loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro na sincronização em lote.');
    } finally {
      setSyncingBatch(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      'ClientExternalId',
      'ClienteNome',
      'CPF_CNPJ',
      'Email',
      'Telefone',
      'BaseExternalId',
      'LojaNome',
      'DatabaseName',
      'MensalidadeCentavos',
      'ProxVencimento',
      'StatusBase',
      'Sincronizado',
    ];
    const lines = reconciliation.map((r) =>
      [
        r.clientExternalId,
        r.clientName,
        r.document ?? '',
        r.email ?? '',
        r.phone ?? '',
        r.baseExternalId,
        r.baseName,
        r.databaseName,
        r.monthlyAmountCents,
        r.nextDueDate ?? '',
        r.status,
        r.syncEnabled ? 'SIM' : 'NAO',
      ]
        .map(sanitizeCsv)
        .join(';'),
    );
    const blob = new Blob([`\uFEFF${headers.join(';')}\r\n${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conciliacao-leadger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(reconciliation, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conciliacao-leadger-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !status) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-zinc-400 text-sm">
        <Loader2 size={18} className="animate-spin text-violet-400" /> Carregando módulo Teltech Leadger…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status Banner do Ambiente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <p className="text-xs text-zinc-400 uppercase font-bold flex items-center gap-1.5">
            <ShieldCheck size={14} className={status?.webhookEnabled ? 'text-emerald-400' : 'text-amber-400'} />
            Emissor Webhook v1
          </p>
          <p className="text-base font-extrabold text-white">
            {status?.webhookEnabled ? 'Ativo (envios automáticos)' : 'Travado (modo seguro / offline)'}
          </p>
          <p className="text-xs text-zinc-500 truncate">
            {status?.urlHost ? `Destino: ${status.urlHost}` : 'Defina LEADGER_WEBHOOK_URL no .env'}
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <p className="text-xs text-zinc-400 uppercase font-bold">Credenciais Backend (.env)</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${status?.hasUrl ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
              URL: {status?.hasUrl ? 'OK' : 'Pendente'}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${status?.hasSource ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
              Source: {status?.source || 'Pendente'}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${status?.hasSecret ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' : 'bg-amber-500/10 text-amber-300 border-amber-500/25'}`}>
              Secret: {status?.hasSecret ? 'Configurado' : 'Aguardando Leadger'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 pt-1">Segredos ficam apenas no backend, nunca no navegador.</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <p className="text-xs text-zinc-400 uppercase font-bold">Envio de Logos (Seção 11)</p>
          <p className="text-base font-extrabold text-white">
            {status?.photoSyncEnabled ? 'Habilitado (client.upsert)' : 'Pausado por padrão'}
          </p>
          <p className="text-xs text-zinc-500 truncate">
            {status?.photoHostValid
              ? `HTTPS aprovado: ${status.photoPublicHost}`
              : 'Requer PUBLIC_APP_URL em HTTPS público'}
          </p>
        </div>
      </div>

      {!status?.tablesReady ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
              <Database size={16} className="text-amber-400" />
              Tabelas do Leadger ainda não aplicadas no banco Heart
            </h3>
            <p className="text-xs text-zinc-300">
              Para liberar clientes titulares, faturas em aberto e a fila de webhook no banco Heart (sem alterar os bancos das lojas), clique no botão ao lado para ir à aba Tenants com <strong>Incluir Heart</strong> marcado e clique em <strong>Atualizar Bancos</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMigrationHeart}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shrink-0 cursor-pointer transition"
          >
            Ir para Atualizar Heart
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              {[
                { id: 'outbox', label: `Fila & Pendências (${(outbox.counts.PENDING ?? 0) + (outbox.counts.FAILED_ACTION_REQUIRED ?? 0)})` },
                { id: 'clients', label: `Clientes Titulares (${clients.length})` },
                { id: 'reconciliation', label: `Conciliação Inicial (${reconciliation.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSubTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    subTab === t.id ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadAll}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar
              </button>

              {subTab === 'outbox' && (
                <button
                  type="button"
                  disabled={!status?.configured || processingQueue}
                  onClick={handleProcessNow}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {processingQueue ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Processar Fila Agora
                </button>
              )}
            </div>
          </div>

          {subTab === 'outbox' && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  {(['ALL', 'PENDING', 'FAILED_ACTION_REQUIRED', 'DELIVERED', 'DEAD_LETTER'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOutboxFilter(st)}
                      className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer transition ${
                        outboxFilter === st
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {st === 'ALL' ? 'Todos' : st} ({st === 'ALL' ? outbox.items.length : (outbox.counts[st] ?? 0)})
                    </button>
                  ))}
                </div>
              </div>

              {outbox.items.length === 0 ? (
                <p className="p-8 text-center text-sm text-zinc-500">Nenhum evento na fila para o filtro selecionado.</p>
              ) : (
                <div className="divide-y divide-zinc-800/70">
                  {outbox.items.map((evt) => (
                    <div key={evt.id} className="p-4 space-y-2 hover:bg-zinc-900/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${OUTBOX_BADGE[evt.status] || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                            {evt.status}
                          </span>
                          <span className="text-xs font-mono font-bold text-white">{evt.eventType}</span>
                          <span className="text-xs text-zinc-400 font-mono truncate">{evt.entityExternalId} (v{evt.entityVersion})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-zinc-500">Tentativas: {evt.attempts}</span>
                          {evt.lastHttpStatus && (
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
                              HTTP {evt.lastHttpStatus}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedJsonId(expandedJsonId === evt.id ? null : evt.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                          >
                            {expandedJsonId === evt.id ? 'Ocultar JSON' : 'Ver JSON'}
                          </button>
                          {evt.status !== 'DELIVERED' && (
                            <button
                              type="button"
                              onClick={() => handleRetryEvent(evt.id)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw size={12} /> Reenviar
                            </button>
                          )}
                        </div>
                      </div>

                      {evt.lastErrorMessage && (
                        <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-1.5 font-mono">
                          {evt.lastErrorCode ? `[${evt.lastErrorCode}] ` : ''}{evt.lastErrorMessage}
                        </p>
                      )}

                      {expandedJsonId === evt.id && (
                        <pre className="text-[11px] font-mono text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-xl p-3 overflow-x-auto max-h-60">
                          {(() => {
                            try {
                              return JSON.stringify(JSON.parse(evt.payloadJson), null, 2);
                            } catch {
                              return evt.payloadJson;
                            }
                          })()}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {subTab === 'clients' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <form onSubmit={handleCreateClient} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3 h-fit">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users size={15} className="text-violet-400" /> Novo Cliente Pagador (Multi-Base)
                </h3>
                <p className="text-xs text-zinc-400">
                  Use para donos que possuem 2 ou mais adegas — todas as bases vinculadas ao mesmo titular compartilham um único ID externo no Leadger sem gerar erro 409.
                </p>
                <input
                  required
                  placeholder="Nome / Razão Social *"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white"
                />
                <input
                  placeholder="CPF ou CNPJ"
                  value={newClient.document}
                  onChange={(e) => setNewClient({ ...newClient, document: e.target.value })}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white"
                />
                <input
                  type="email"
                  placeholder="E-mail financeiro"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white"
                />
                <input
                  placeholder="WhatsApp / Telefone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white"
                />
                <button
                  type="submit"
                  disabled={creatingClient}
                  className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {creatingClient ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Cadastrar Cliente Titular
                </button>
              </form>

              <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 font-bold text-sm text-white">
                  Clientes Pagadores Cadastrados ({clients.length})
                </div>
                {clients.length === 0 ? (
                  <p className="p-8 text-center text-sm text-zinc-500">
                    Os titulares são criados automaticamente quando você acessa o Financeiro/Leadger de uma loja ou cadastra ao lado.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-800/70">
                    {clients.map((c) => (
                      <div key={c.id} className="p-4 flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-white text-sm">{c.name}</p>
                          <p className="text-xs text-zinc-400 font-mono">
                            {c.externalId} · v{c.version}
                            {c.document ? ` · Doc: ${c.document}` : ''}
                            {c.email ? ` · ${c.email}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(c.bases || []).map((b: any) => (
                            <span key={b.id} className="text-[11px] px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
                              <Building2 size={11} className="inline mr-1 text-violet-400" />
                              {b.baseName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {subTab === 'reconciliation' && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-white">Conciliação Inicial de Clientes, Bases e Faturas (Seção 5 & 10)</h3>
                  <p className="text-xs text-zinc-400">
                    Exporte esta lista para vincular clientes já existentes no Leadger antes de ativar envios em lote.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 hover:border-zinc-500 text-xs font-bold text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} /> Exportar CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportJson}
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 hover:border-zinc-500 text-xs font-bold text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileJson size={13} /> Exportar JSON
                  </button>
                  <button
                    type="button"
                    disabled={selectedTenantIds.length === 0 || syncingBatch}
                    onClick={handleBatchSync}
                    className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {syncingBatch ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Sincronizar Selecionadas ({selectedTenantIds.length}/25)
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 uppercase">
                    <tr>
                      <th className="p-3 w-8">Sel.</th>
                      <th className="p-3">Loja / Base</th>
                      <th className="p-3">Titular / Documento</th>
                      <th className="p-3">E-mail</th>
                      <th className="p-3 text-right">Mensalidade</th>
                      <th className="p-3 text-right">Status Leadger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {reconciliation.map((row) => {
                      const checked = selectedTenantIds.includes(row.tenantId);
                      return (
                        <tr key={row.tenantId} className="hover:bg-zinc-900/40">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!checked && selectedTenantIds.length >= 25}
                              onChange={(e) => {
                                setSelectedTenantIds((prev) =>
                                  e.target.checked
                                    ? [...prev, row.tenantId].slice(0, 25)
                                    : prev.filter((id) => id !== row.tenantId),
                                );
                              }}
                              className="accent-violet-500"
                            />
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-white">{row.baseName || row.tenantName}</p>
                            <p className="font-mono text-[11px] text-zinc-500">{row.baseExternalId}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-zinc-200">{row.clientName}</p>
                            <p className="font-mono text-[11px] text-zinc-500">
                              {row.document || 'Sem CPF/CNPJ'} · {row.clientExternalId}
                            </p>
                          </td>
                          <td className="p-3 text-zinc-300">{row.email || <span className="text-zinc-600">—</span>}</td>
                          <td className="p-3 text-right font-bold text-emerald-300 tabular-nums">
                            {formatCents(row.monthlyAmountCents)}
                          </td>
                          <td className="p-3 text-right">
                            {row.baseSyncedAt ? (
                              <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={11} /> Vinculada
                              </span>
                            ) : row.syncEnabled ? (
                              <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                Enfileirada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-full">
                                Desativada
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Painel de faturas em aberto, estorno e configuração Leadger dentro da aba Financeiro do Tenant no /sys-init.
 */
export function TenantLeadgerFinanceSection({
  tenantId,
  pin,
  onChanged,
}: {
  tenantId: string;
  pin: string;
  onChanged: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTables, setMissingTables] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [billingDay, setBillingDay] = useState('10');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncingBase, setSyncingBase] = useState(false);

  const [newInvAmount, setNewInvAmount] = useState('');
  const [newInvDueDate, setNewInvDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [creatingInv, setCreatingInv] = useState(false);

  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState('pix');

  const loadTenantLeadger = useCallback(async () => {
    setLoading(true);
    setMissingTables(false);
    try {
      const headers = { 'x-setup-pin': pin };
      const [detRes, cliRes] = await Promise.all([
        api.get(`/tenants/setup/leadger/tenants/${tenantId}`, { headers }),
        api.get('/tenants/setup/leadger/clients', { headers }),
      ]);
      const det = detRes.data;
      setData(det);
      setClients(cliRes.data || []);
      setSelectedClientId(det?.base?.billingClientId || '');
      setBillingDay(String(det?.base?.billingDay ?? 10));
      setSyncEnabled(Boolean(det?.base?.syncEnabled));
      if (!newInvAmount && det?.base?.monthlyAmountCents > 0) {
        setNewInvAmount((det.base.monthlyAmountCents / 100).toFixed(2));
      }
    } catch (err: any) {
      const msg = String(err?.response?.data?.message || '');
      if (msg.includes('Atualizar Bancos') || msg.includes('Heart')) {
        setMissingTables(true);
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, pin]);

  useEffect(() => {
    loadTenantLeadger();
  }, [loadTenantLeadger]);

  if (loading) {
    return (
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-400 flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-violet-400" /> Carregando faturas e integração Leadger…
      </div>
    );
  }

  if (missingTables || !data) {
    return (
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-400 flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-400 shrink-0" />
        <span>Tabelas Leadger no Heart ainda não aplicadas (clique em <strong>Incluir Heart → Atualizar Bancos</strong> no painel principal para habilitar faturas/estorno).</span>
      </div>
    );
  }

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.put(
        `/tenants/setup/leadger/tenants/${tenantId}/base`,
        {
          billingClientId: selectedClientId,
          billingDay: Number(billingDay),
          syncEnabled,
        },
        { headers: { 'x-setup-pin': pin } },
      );
      toast.success('Configuração da base salva!');
      await loadTenantLeadger();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar configuração Leadger.');
    } finally {
      setSavingConfig(false);
    }
  };

  const syncSnapshotNow = async () => {
    setSyncingBase(true);
    try {
      await api.post(`/tenants/setup/leadger/tenants/${tenantId}/sync-base`, {}, { headers: { 'x-setup-pin': pin } });
      toast.success('Snapshot da base enfileirado para o Leadger!');
      await loadTenantLeadger();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao enfileirar snapshot.');
    } finally {
      setSyncingBase(false);
    }
  };

  const handleCreateInvoice = async () => {
    const val = Number(newInvAmount.replace(',', '.'));
    if (!Number.isFinite(val) || val <= 0) {
      toast.error('Informe um valor maior que R$ 0,00.');
      return;
    }
    setCreatingInv(true);
    try {
      await api.post(
        `/tenants/setup/leadger/tenants/${tenantId}/invoices`,
        { amount: val, dueDate: newInvDueDate },
        { headers: { 'x-setup-pin': pin } },
      );
      toast.success('Fatura criada!');
      await loadTenantLeadger();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar fatura.');
    } finally {
      setCreatingInv(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      await api.post(
        `/tenants/setup/leadger/invoices/${invoiceId}/pay`,
        { paymentMethod: payMethod },
        { headers: { 'x-setup-pin': pin } },
      );
      toast.success('Fatura baixada e próxima competência preparada!');
      setPayingInvoiceId(null);
      await loadTenantLeadger();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao baixar fatura.');
    }
  };

  const handleRefundInvoice = async (invoiceId: string) => {
    if (!window.confirm('Estornar este pagamento? A fatura voltará para Pendente e notificará o Leadger para reverter o saldo.')) {
      return;
    }
    try {
      await api.post(
        `/tenants/setup/leadger/invoices/${invoiceId}/refund`,
        { targetStatus: 'pending', reason: 'Estorno via sys-init' },
        { headers: { 'x-setup-pin': pin } },
      );
      toast.success('Pagamento estornado e evento enfileirado!');
      await loadTenantLeadger();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao estornar fatura.');
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!window.confirm('Cancelar esta fatura em aberto?')) return;
    try {
      await api.post(`/tenants/setup/leadger/invoices/${invoiceId}/cancel`, {}, { headers: { 'x-setup-pin': pin } });
      toast.success('Fatura cancelada.');
      await loadTenantLeadger();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao cancelar fatura.');
    }
  };

  return (
    <div className="bg-zinc-950/70 border border-violet-500/25 rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-bold text-violet-300 text-sm flex items-center gap-2">
            <Database size={15} /> Faturas em Aberto &amp; Integração Teltech Leadger
          </h4>
          <p className="text-[11px] text-zinc-500 font-mono">
            Base: {data.base?.baseExternalId} (v{data.base?.baseVersion}) · Cliente: {data.client?.externalId}
          </p>
        </div>

        <button
          type="button"
          disabled={syncingBase}
          onClick={syncSnapshotNow}
          className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/40 text-violet-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          {syncingBase ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Enfileirar Snapshot Base
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <label className="flex flex-col gap-1 text-zinc-400">
          Cliente Titular (1:N)
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.document || c.email || c.externalId})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-zinc-400">
          Dia Fixo Vencimento (1–31)
          <input
            type="number"
            min={1}
            max={31}
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white"
          />
        </label>

        <div className="flex items-end justify-between gap-2">
          <label className="flex items-center gap-2 text-zinc-300 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={(e) => setSyncEnabled(e.target.checked)}
              className="accent-violet-500 w-4 h-4"
            />
            <span>Sync Leadger Ativo</span>
          </label>
          <button
            type="button"
            disabled={savingConfig}
            onClick={saveConfig}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold cursor-pointer"
          >
            {savingConfig ? '...' : 'Salvar Config'}
          </button>
        </div>
      </div>

      {/* Lançar nova fatura */}
      <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-zinc-800/80 text-xs">
        <label className="flex flex-col gap-1 text-zinc-400">
          Valor Nova Fatura (R$)
          <input
            type="text"
            placeholder="149.90"
            value={newInvAmount}
            onChange={(e) => setNewInvAmount(e.target.value)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white w-32"
          />
        </label>
        <label className="flex flex-col gap-1 text-zinc-400">
          Vencimento
          <input
            type="date"
            value={newInvDueDate}
            onChange={(e) => setNewInvDueDate(e.target.value)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white [color-scheme:dark]"
          />
        </label>
        <button
          type="button"
          disabled={creatingInv}
          onClick={handleCreateInvoice}
          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} /> Gerar Fatura
        </button>
      </div>

      {/* Lista de Faturas */}
      {(data.invoices || []).length === 0 ? (
        <p className="text-xs text-zinc-500">Nenhuma fatura gerada nesta base ainda.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {data.invoices.map((inv: any) => (
            <div key={inv.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-bold text-white">
                  {inv.referenceMonth} · {formatCents(inv.amountCents)}{' '}
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                    inv.status === 'paid'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : inv.status === 'cancelled'
                        ? 'bg-zinc-700 text-zinc-400'
                        : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {inv.status === 'paid' ? `Paga (${PAYMENT_METHOD_LABELS[inv.paymentMethod] || '—'})` : inv.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                  </span>
                </p>
                <p className="text-[11px] text-zinc-500">
                  Venc: {inv.dueDate} · v{inv.version}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {inv.status === 'pending' && (
                  <>
                    {payingInvoiceId === inv.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="p-1 rounded bg-zinc-950 border border-zinc-700 text-white"
                        >
                          {Object.entries(PAYMENT_METHOD_LABELS).map(([k, lbl]) => (
                            <option key={k} value={k}>{lbl}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handlePayInvoice(inv.id)}
                          className="px-2 py-1 rounded bg-emerald-600 text-white font-bold cursor-pointer"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayingInvoiceId(null)}
                          className="px-1.5 py-1 text-zinc-400 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPayingInvoiceId(inv.id)}
                        className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold cursor-pointer transition"
                      >
                        Dar Baixa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCancelInvoice(inv.id)}
                      className="p-1 rounded text-zinc-400 hover:text-rose-400 cursor-pointer"
                      title="Cancelar fatura"
                    >
                      <XCircle size={14} />
                    </button>
                  </>
                )}
                {inv.status === 'paid' && (
                  <button
                    type="button"
                    onClick={() => handleRefundInvoice(inv.id)}
                    className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 font-bold cursor-pointer transition"
                  >
                    Estornar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
