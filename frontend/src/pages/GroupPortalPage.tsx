import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import {
  BarChart2,
  Package,
  Tag,
  ArrowLeftRight,
  LogOut,
  Building2,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Star,
  Search,
  Plus,
  RefreshCw,
  X,
  AlertCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TenantDashboard {
  tenantId: string;
  alias: string;
  salesToday: number;
  salesMonth: number;
  countToday: number;
  topProducts: { productId: string; name: string; totalQty: number }[];
  error?: string;
}

interface DashboardData {
  groupId: string;
  groupName: string;
  tenants: TenantDashboard[];
}

interface StockCell {
  qty: number;
  productId: string;
  unit: string;
}

interface StockRow {
  name: string;
  tenants: Record<string, StockCell>;
}

interface StockData {
  groupId: string;
  tenantLabels: Record<string, string>;
  rows: StockRow[];
}

interface ProductRow {
  id: string;
  name: string;
  priceSell: number;
  priceCost: number;
  unit: string;
  stock: number;
  tenantId: string;
  tenantAlias: string;
}

interface Transfer {
  id: string;
  from: string;
  to: string;
  product: string;
  qty: number;
  time: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPANY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const fmtNum = (v: number) =>
  new Intl.NumberFormat('pt-BR').format(v ?? 0);

function getToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem('7bar-auth') || '{}')?.state?.token ?? null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = '1rem', radius = '0.5rem' }: { w?: string; h?: string; radius?: string }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #27272a 25%, #3f3f46 50%, #27272a 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = '500px',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 300, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#18181b', border: '1px solid rgba(63,63,70,0.7)',
          borderRadius: '1.25rem', padding: '2rem', width: '100%',
          maxWidth, boxShadow: '0 32px 64px rgba(0,0,0,0.8)',
          animation: 'slideUp 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f4f4f5' }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(63,63,70,0.6)',
              borderRadius: '0.5rem', color: '#a1a1aa', cursor: 'pointer',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.625rem 0.875rem',
  background: 'rgba(39,39,42,0.9)', border: '1px solid rgba(63,63,70,0.8)',
  borderRadius: '0.625rem', color: '#f4f4f5', fontSize: '0.875rem',
  outline: 'none', boxSizing: 'border-box', marginBottom: '1rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.375rem', display: 'block', fontWeight: 500,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer', appearance: 'auto',
};

function FormField({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, color, icon,
}: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(24,24,27,0.95)', border: `1px solid ${color}33`,
        borderRadius: '1rem', padding: '1.25rem 1.5rem', position: 'relative',
        overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${color}22`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            {label}
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>{sub}</div>}
        </div>
        <div style={{
          width: '44px', height: '44px', borderRadius: '0.75rem',
          background: `${color}18`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function TabDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/groups/my/dashboard', { headers: authHeaders() });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(`Erro ao carregar dashboard: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: '#18181b', border: '1px solid rgba(63,63,70,0.4)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton h="0.75rem" w="60%" />
            <Skeleton h="2rem" w="80%" />
            <Skeleton h="0.6rem" w="40%" />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', gap: '0.5rem', color: '#52525b' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Carregando dados do grupo...</span>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem', color: '#f87171' }}>
      <AlertCircle size={40} />
      <div style={{ fontSize: '0.9rem' }}>{error}</div>
      <button onClick={load} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <RefreshCw size={14} /> Tentar novamente
      </button>
    </div>
  );

  if (!data) return null;

  const validTenants = data.tenants.filter((t) => !t.error);
  const totalSalesToday = validTenants.reduce((s, t) => s + t.salesToday, 0);
  const totalSalesMonth = validTenants.reduce((s, t) => s + t.salesMonth, 0);
  const totalCountToday = validTenants.reduce((s, t) => s + t.countToday, 0);
  const bestTenant = validTenants.reduce((b, t) => (!b || t.salesToday > b.salesToday ? t : b), validTenants[0]);
  const maxMonth = Math.max(...validTenants.map((t) => t.salesMonth), 1);

  // Aggregate top products across all tenants
  const productMap: Record<string, { name: string; qty: number }> = {};
  for (const t of validTenants) {
    for (const p of t.topProducts) {
      if (productMap[p.productId]) {
        productMap[p.productId].qty += p.totalQty;
      } else {
        productMap[p.productId] = { name: p.name, qty: p.totalQty };
      }
    }
  }
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 10);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <MetricCard
          label="Total Vendas Hoje"
          value={fmtCurrency(totalSalesToday)}
          sub={`${fmtNum(totalCountToday)} transações`}
          color="#10b981"
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          label="Total Vendas Mês"
          value={fmtCurrency(totalSalesMonth)}
          sub="Acumulado do mês"
          color="#3b82f6"
          icon={<BarChart2 size={20} />}
        />
        <MetricCard
          label="Transações Hoje"
          value={fmtNum(totalCountToday)}
          sub="Todas as empresas"
          color="#8b5cf6"
          icon={<ShoppingBag size={20} />}
        />
        <MetricCard
          label="Melhor Empresa"
          value={bestTenant ? fmtCurrency(bestTenant.salesToday) : '—'}
          sub={bestTenant?.alias ?? ''}
          color="#f59e0b"
          icon={<Star size={20} />}
        />
      </div>

      {/* Per-company cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {validTenants.map((t, i) => {
          const color = COMPANY_COLORS[i % COMPANY_COLORS.length];
          const pct = totalSalesToday > 0 ? (t.salesToday / totalSalesToday) * 100 : 0;
          return (
            <div
              key={t.tenantId}
              style={{
                background: 'rgba(24,24,27,0.95)', border: `1px solid ${color}33`,
                borderRadius: '1rem', padding: '1.25rem', overflow: 'hidden',
                position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${color}22`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${color}, ${color}66)` }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                  <Building2 size={16} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f4f4f5' }}>{t.alias}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.625rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hoje</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#4ade80' }}>{fmtCurrency(t.salesToday)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.625rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mês</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#60a5fa' }}>{fmtCurrency(t.salesMonth)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.625rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Qtd</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f4f4f5' }}>{t.countToday}</div>
                </div>
              </div>
              {/* Share bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#71717a', marginBottom: '0.375rem' }}>
                <span>Participação hoje</span>
                <span style={{ color }}>{pct.toFixed(1)}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(39,39,42,0.8)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`, borderRadius: '999px', transition: 'width 0.8s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div style={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e4e4e7', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={16} style={{ color: '#3b82f6' }} />
          Comparativo de Vendas — Mês
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '140px', padding: '0 0.5rem' }}>
          {validTenants.map((t, i) => {
            const color = COMPANY_COLORS[i % COMPANY_COLORS.length];
            const pct = (t.salesMonth / maxMonth) * 100;
            return (
              <div key={t.tenantId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>
                  {fmtCurrency(t.salesMonth)}
                </div>
                <div
                  style={{
                    width: '100%', maxWidth: '80px', background: `linear-gradient(to top, ${color}, ${color}88)`,
                    borderRadius: '0.5rem 0.5rem 0 0', height: `${pct}%`, minHeight: '4px',
                    transition: 'height 0.8s ease', position: 'relative', overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)' }} />
                </div>
                <div style={{ fontSize: '0.65rem', color: '#71717a', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                  {t.alias}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div style={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e4e4e7', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Star size={16} style={{ color: '#f59e0b' }} />
            Top Produtos — Consolidado do Grupo
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {topProducts.map(([pid, p], i) => {
              const color = COMPANY_COLORS[i % COMPANY_COLORS.length];
              const maxQty = topProducts[0][1].qty;
              const pct = (p.qty / maxQty) * 100;
              return (
                <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '24px', textAlign: 'right', fontSize: '0.75rem', color: '#52525b', fontWeight: 700 }}>
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#d4d4d8' }}>{p.name}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{fmtNum(p.qty)} un</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(39,39,42,0.8)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '999px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Estoque ──────────────────────────────────────────────────────────────

function TabEstoque() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [entryModal, setEntryModal] = useState(false);
  const [entryForm, setEntryForm] = useState({ tenantId: '', productId: '', quantity: '', costPrice: '' });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/groups/my/stock', { headers: authHeaders() });
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      setError(`Erro ao carregar estoque: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEntry = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/groups/my/stock-entry', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          tenantId: entryForm.tenantId,
          productId: entryForm.productId,
          quantity: Number(entryForm.quantity),
          costPrice: entryForm.costPrice ? Number(entryForm.costPrice) : undefined,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setEntryModal(false);
      setEntryForm({ tenantId: '', productId: '', quantity: '', costPrice: '' });
      setSuccessMsg('Entrada registrada com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
      load();
    } catch (e: unknown) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const tenantIds = data ? Object.keys(data.tenantLabels) : [];
  const filtered = data
    ? data.rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  function qtyColor(qty: number | null) {
    if (qty === null) return '#52525b';
    if (qty < 3) return '#f87171';
    if (qty < 10) return '#fbbf24';
    return '#4ade80';
  }
  function qtyBg(qty: number | null) {
    if (qty === null) return 'transparent';
    if (qty < 3) return 'rgba(239,68,68,0.08)';
    if (qty < 10) return 'rgba(251,191,36,0.08)';
    return 'rgba(74,222,128,0.06)';
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
          <input
            id="stock-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            style={{ ...inputStyle, paddingLeft: '2.25rem', marginBottom: 0 }}
          />
        </div>
        <button
          id="btn-stock-entry"
          onClick={() => setEntryModal(true)}
          style={{ padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none', borderRadius: '0.625rem', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <Plus size={14} /> Entrada de Estoque
        </button>
        <button
          onClick={load}
          title="Atualizar"
          style={{ padding: '0.625rem', background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '0.625rem', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <RefreshCw size={14} />
        </button>
        {successMsg && (
          <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600 }}>✓ {successMsg}</span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', gap: '0.5rem', color: '#52525b' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Carregando estoque...</span>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem', color: '#f87171' }}>
          <AlertCircle size={40} />
          <div style={{ fontSize: '0.9rem' }}>{error}</div>
          <button onClick={load} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      ) : data && (
        <div style={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(63,63,70,0.6)' }}>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.07em', position: 'sticky', left: 0, background: '#1c1c1f', zIndex: 10, minWidth: '180px' }}>
                  Produto
                </th>
                {tenantIds.map((tid, i) => (
                  <th key={tid} style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.7rem', color: COMPANY_COLORS[i % COMPANY_COLORS.length], textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: '120px' }}>
                    {data.tenantLabels[tid]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, ri) => (
                <tr
                  key={row.name}
                  style={{ borderBottom: '1px solid rgba(39,39,42,0.5)', background: ri % 2 === 0 ? 'transparent' : 'rgba(39,39,42,0.15)', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(63,63,70,0.2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ri % 2 === 0 ? 'transparent' : 'rgba(39,39,42,0.15)'; }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#d4d4d8', position: 'sticky', left: 0, background: ri % 2 === 0 ? '#18181b' : '#1a1a1d', zIndex: 5, fontWeight: 500 }}>
                    {row.name}
                  </td>
                  {tenantIds.map((tid) => {
                    const cell = row.tenants[tid];
                    const qty = cell?.qty ?? null;
                    return (
                      <td key={tid} style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: qty !== null && qty < 3 ? 700 : 500, color: qtyColor(qty), background: qtyBg(qty) }}>
                        {qty !== null ? `${qty} ${cell?.unit ?? ''}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={tenantIds.length + 1} style={{ padding: '3rem', textAlign: 'center', color: '#52525b', fontSize: '0.875rem' }}>
                    Nenhum produto encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {data && (
        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.875rem', fontSize: '0.7rem', color: '#71717a' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />Acima de 10</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />Entre 3–10</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />Abaixo de 3</span>
        </div>
      )}

      {/* Entry Modal */}
      <Modal open={entryModal} onClose={() => setEntryModal(false)} title="Entrada de Estoque">
        <FormField label="Empresa">
          <select
            id="entry-tenant"
            style={selectStyle}
            value={entryForm.tenantId}
            onChange={(e) => setEntryForm((f) => ({ ...f, tenantId: e.target.value }))}
          >
            <option value="">— Selecione a empresa —</option>
            {data && Object.entries(data.tenantLabels).map(([tid, label]) => (
              <option key={tid} value={tid}>{label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="ID do Produto">
          <input
            id="entry-productId"
            style={inputStyle}
            placeholder="productId"
            value={entryForm.productId}
            onChange={(e) => setEntryForm((f) => ({ ...f, productId: e.target.value }))}
          />
        </FormField>
        <FormField label="Quantidade">
          <input
            id="entry-qty"
            style={inputStyle}
            type="number"
            min="1"
            placeholder="0"
            value={entryForm.quantity}
            onChange={(e) => setEntryForm((f) => ({ ...f, quantity: e.target.value }))}
          />
        </FormField>
        <FormField label="Preço de Custo (opcional)">
          <input
            id="entry-cost"
            style={inputStyle}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={entryForm.costPrice}
            onChange={(e) => setEntryForm((f) => ({ ...f, costPrice: e.target.value }))}
          />
        </FormField>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <button onClick={() => setEntryModal(false)} style={{ padding: '0.625rem 1rem', background: 'transparent', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '0.625rem', color: '#a1a1aa', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>
            Cancelar
          </button>
          <button
            id="btn-entry-confirm"
            onClick={handleEntry}
            disabled={submitting}
            style={{ padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none', borderRadius: '0.625rem', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando…</> : 'Confirmar Entrada'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab: Produtos ─────────────────────────────────────────────────────────────

function TabProdutos() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [newModal, setNewModal] = useState(false);
  const [priceModal, setPriceModal] = useState<{ name: string; price: number } | null>(null);
  const [newForm, setNewForm] = useState({ name: '', priceSell: '', priceCost: '', unit: 'UN', categoryName: 'Geral' });
  const [priceForm, setPriceForm] = useState({ productName: '', priceSell: '' });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/groups/my/products', { headers: authHeaders() });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setProducts(json.products ?? []);
    } catch (e: unknown) {
      setError(`Erro ao carregar produtos: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleNew = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/groups/my/products', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...newForm, priceSell: Number(newForm.priceSell), priceCost: Number(newForm.priceCost) }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setNewModal(false);
      setNewForm({ name: '', priceSell: '', priceCost: '', unit: 'UN', categoryName: 'Geral' });
      setSuccessMsg('Produto criado em todos os tenants!');
      setTimeout(() => setSuccessMsg(''), 3000);
      load();
    } catch (e: unknown) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrice = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/groups/my/products/price', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ productName: priceForm.productName, priceSell: Number(priceForm.priceSell) }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setPriceModal(null);
      setPriceForm({ productName: '', priceSell: '' });
      setSuccessMsg('Preço atualizado em todos os tenants!');
      setTimeout(() => setSuccessMsg(''), 3000);
      load();
    } catch (e: unknown) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Group by product name to show prices per company
  const grouped = products.reduce<Record<string, ProductRow[]>>((acc, p) => {
    if (!acc[p.name]) acc[p.name] = [];
    acc[p.name].push(p);
    return acc;
  }, {});

  const productNames = Object.keys(grouped).filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  // Collect all unique tenant aliases
  const tenantAliases = [...new Set(products.map((p) => p.tenantAlias))];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
          <input
            id="products-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            style={{ ...inputStyle, paddingLeft: '2.25rem', marginBottom: 0 }}
          />
        </div>
        <button
          id="btn-new-product"
          onClick={() => setNewModal(true)}
          style={{ padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none', borderRadius: '0.625rem', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <Plus size={14} /> Novo em Todos
        </button>
        <button onClick={load} title="Atualizar" style={{ padding: '0.625rem', background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '0.625rem', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={14} />
        </button>
        {successMsg && <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600 }}>✓ {successMsg}</span>}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', gap: '0.5rem', color: '#52525b' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Carregando produtos...</span>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem', color: '#f87171' }}>
          <AlertCircle size={40} />
          <div style={{ fontSize: '0.9rem' }}>{error}</div>
          <button onClick={load} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      ) : (
        <div style={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(63,63,70,0.6)' }}>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: '200px' }}>
                  Produto
                </th>
                {tenantAliases.map((alias, i) => (
                  <th key={alias} style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.7rem', color: COMPANY_COLORS[i % COMPANY_COLORS.length], textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: '120px' }}>
                    {alias}
                  </th>
                ))}
                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {productNames.map((name, ri) => {
                const rows = grouped[name];
                return (
                  <tr
                    key={name}
                    style={{ borderBottom: '1px solid rgba(39,39,42,0.5)', background: ri % 2 === 0 ? 'transparent' : 'rgba(39,39,42,0.15)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(63,63,70,0.2)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ri % 2 === 0 ? 'transparent' : 'rgba(39,39,42,0.15)'; }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#d4d4d8', fontWeight: 500 }}>{name}</td>
                    {tenantAliases.map((alias) => {
                      const match = rows.find((r) => r.tenantAlias === alias);
                      return (
                        <td key={alias} style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.875rem', color: match ? '#60a5fa' : '#52525b' }}>
                          {match ? fmtCurrency(match.priceSell) : '—'}
                        </td>
                      );
                    })}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <button
                        id={`btn-price-${name.replace(/\s+/g, '-')}`}
                        onClick={() => {
                          const avg = rows.reduce((s, r) => s + r.priceSell, 0) / rows.length;
                          setPriceForm({ productName: name, priceSell: avg.toFixed(2) });
                          setPriceModal({ name, price: avg });
                        }}
                        style={{ padding: '0.375rem 0.75rem', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.4)', borderRadius: '0.5rem', color: '#60a5fa', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        Atualizar Preço
                      </button>
                    </td>
                  </tr>
                );
              })}
              {productNames.length === 0 && (
                <tr>
                  <td colSpan={tenantAliases.length + 2} style={{ padding: '3rem', textAlign: 'center', color: '#52525b', fontSize: '0.875rem' }}>
                    Nenhum produto encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Product Modal */}
      <Modal open={newModal} onClose={() => setNewModal(false)} title="Novo Produto em Todos os Tenants">
        <FormField label="Nome do Produto">
          <input id="new-product-name" style={inputStyle} value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Heineken 600ml" />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <FormField label="Preço de Venda">
            <input id="new-product-price-sell" style={inputStyle} type="number" step="0.01" min="0" value={newForm.priceSell} onChange={(e) => setNewForm((f) => ({ ...f, priceSell: e.target.value }))} placeholder="0.00" />
          </FormField>
          <FormField label="Preço de Custo">
            <input id="new-product-price-cost" style={inputStyle} type="number" step="0.01" min="0" value={newForm.priceCost} onChange={(e) => setNewForm((f) => ({ ...f, priceCost: e.target.value }))} placeholder="0.00" />
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <FormField label="Unidade">
            <input id="new-product-unit" style={inputStyle} value={newForm.unit} onChange={(e) => setNewForm((f) => ({ ...f, unit: e.target.value }))} />
          </FormField>
          <FormField label="Categoria">
            <input id="new-product-category" style={inputStyle} value={newForm.categoryName} onChange={(e) => setNewForm((f) => ({ ...f, categoryName: e.target.value }))} />
          </FormField>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <button onClick={() => setNewModal(false)} style={{ padding: '0.625rem 1rem', background: 'transparent', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '0.625rem', color: '#a1a1aa', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>Cancelar</button>
          <button
            id="btn-new-product-confirm"
            onClick={handleNew}
            disabled={submitting}
            style={{ padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none', borderRadius: '0.625rem', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Criando…</> : 'Criar em Todos'}
          </button>
        </div>
      </Modal>

      {/* Price Modal */}
      <Modal open={!!priceModal} onClose={() => setPriceModal(null)} title={`Atualizar Preço — ${priceModal?.name ?? ''}`}>
        <FormField label="Nome do Produto (exato)">
          <input id="update-price-name" style={inputStyle} value={priceForm.productName} onChange={(e) => setPriceForm((f) => ({ ...f, productName: e.target.value }))} />
        </FormField>
        <FormField label="Novo Preço de Venda">
          <input id="update-price-value" style={inputStyle} type="number" step="0.01" min="0" value={priceForm.priceSell} onChange={(e) => setPriceForm((f) => ({ ...f, priceSell: e.target.value }))} placeholder="0.00" />
        </FormField>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <button onClick={() => setPriceModal(null)} style={{ padding: '0.625rem 1rem', background: 'transparent', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '0.625rem', color: '#a1a1aa', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>Cancelar</button>
          <button
            id="btn-update-price-confirm"
            onClick={handlePrice}
            disabled={submitting}
            style={{ padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none', borderRadius: '0.625rem', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Atualizando…</> : 'Atualizar em Todos'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab: Transferências ───────────────────────────────────────────────────────

function TabTransferencias() {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fromTenantId: '', toTenantId: '', productId: '', quantity: '' });
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Transfer[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/groups/my/stock', { headers: authHeaders() });
      if (!res.ok) throw new Error(`${res.status}`);
      setStockData(await res.json());
    } catch (e: unknown) {
      setError(`Erro ao carregar dados: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tenantIds = stockData ? Object.keys(stockData.tenantLabels) : [];

  // Collect unique products
  const products = stockData
    ? stockData.rows
        .filter((r) => form.fromTenantId ? r.tenants[form.fromTenantId] !== undefined : true)
        .map((r) => ({ name: r.name, productId: r.tenants[form.fromTenantId]?.productId ?? '' }))
        .filter((p) => p.productId)
    : [];

  const handleTransfer = async () => {
    if (!form.fromTenantId || !form.toTenantId || !form.productId || !form.quantity) {
      alert('Preencha todos os campos.');
      return;
    }
    if (form.fromTenantId === form.toTenantId) {
      alert('Empresa de origem e destino não podem ser iguais.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/groups/my/stock-transfer', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          fromTenantId: form.fromTenantId,
          toTenantId: form.toTenantId,
          productId: form.productId,
          quantity: Number(form.quantity),
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const fromLabel = stockData?.tenantLabels[form.fromTenantId] ?? form.fromTenantId;
      const toLabel = stockData?.tenantLabels[form.toTenantId] ?? form.toTenantId;
      const productName = stockData?.rows.find((r) => r.tenants[form.fromTenantId]?.productId === form.productId)?.name ?? form.productId;
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          from: fromLabel,
          to: toLabel,
          product: productName,
          qty: Number(form.quantity),
          time: new Date().toLocaleTimeString('pt-BR'),
        },
        ...prev,
      ].slice(0, 20));
      setForm({ fromTenantId: '', toTenantId: '', productId: '', quantity: '' });
      setSuccessMsg(`Transferência de ${form.quantity} unidades realizada!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      load();
    } catch (e: unknown) {
      alert(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
      {/* Transfer Form */}
      <div style={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e4e4e7', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeftRight size={16} style={{ color: '#3b82f6' }} />
          Nova Transferência
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#52525b', padding: '1rem 0' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.85rem' }}>Carregando...</span>
          </div>
        ) : error ? (
          <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</div>
        ) : (
          <>
            <FormField label="Empresa de Origem">
              <select
                id="transfer-from"
                style={selectStyle}
                value={form.fromTenantId}
                onChange={(e) => setForm((f) => ({ ...f, fromTenantId: e.target.value, productId: '' }))}
              >
                <option value="">— Selecione a origem —</option>
                {tenantIds.map((tid) => (
                  <option key={tid} value={tid}>{stockData!.tenantLabels[tid]}</option>
                ))}
              </select>
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '-0.25rem 0 0.75rem', color: '#3b82f6' }}>
              <ArrowLeftRight size={16} />
            </div>

            <FormField label="Empresa de Destino">
              <select
                id="transfer-to"
                style={selectStyle}
                value={form.toTenantId}
                onChange={(e) => setForm((f) => ({ ...f, toTenantId: e.target.value }))}
              >
                <option value="">— Selecione o destino —</option>
                {tenantIds.filter((tid) => tid !== form.fromTenantId).map((tid) => (
                  <option key={tid} value={tid}>{stockData!.tenantLabels[tid]}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Produto">
              <select
                id="transfer-product"
                style={selectStyle}
                value={form.productId}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                disabled={!form.fromTenantId}
              >
                <option value="">— Selecione o produto —</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>{p.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Quantidade">
              <input
                id="transfer-qty"
                style={inputStyle}
                type="number"
                min="1"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </FormField>

            {successMsg && (
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '0.625rem', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#4ade80', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✓ {successMsg}
              </div>
            )}

            <button
              id="btn-transfer-confirm"
              onClick={handleTransfer}
              disabled={submitting}
              style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Transferindo…</> : <><ArrowLeftRight size={16} /> Confirmar Transferência</>}
            </button>
          </>
        )}
      </div>

      {/* History */}
      <div style={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e4e4e7', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} style={{ color: '#8b5cf6' }} />
          Histórico da Sessão
          {history.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#52525b', fontWeight: 400 }}>
              {history.length} transferência{history.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#52525b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <ArrowLeftRight size={32} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: '0.875rem' }}>Nenhuma transferência realizada nesta sessão</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {history.map((h) => (
              <div
                key={h.id}
                style={{ background: 'rgba(39,39,42,0.5)', border: '1px solid rgba(63,63,70,0.4)', borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
                  <ArrowLeftRight size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: '#d4d4d8', fontWeight: 500, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.product}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.7rem', color: '#71717a', flexWrap: 'wrap' }}>
                    <span style={{ color: '#60a5fa' }}>{h.from}</span>
                    <ChevronRight size={10} />
                    <span style={{ color: '#4ade80' }}>{h.to}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#8b5cf6' }}>{h.qty} un</div>
                  <div style={{ fontSize: '0.65rem', color: '#52525b' }}>{h.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const SIDEBAR_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'produtos', label: 'Produtos', icon: Tag },
  { id: 'transferencias', label: 'Transferências', icon: ArrowLeftRight },
] as const;

type TabId = typeof SIDEBAR_TABS[number]['id'];

export default function GroupPortalPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [tabKey, setTabKey] = useState(0); // force re-render on tab change

  // Auth guard
  useEffect(() => {
    const token = getToken();
    if (!token || !user || (user.role !== 'group_owner' && !user.groupId)) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setTabKey((k) => k + 1);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#09090b', color: '#f4f4f5',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      {/* Global CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(39,39,42,0.4); }
        ::-webkit-scrollbar-thumb { background: rgba(63,63,70,0.8); border-radius: 3px; }
        input:focus, select:focus { border-color: rgba(59,130,246,0.7) !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.12) !important; }
        input::placeholder { color: #52525b; }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: '240px', flexShrink: 0,
        background: '#111113',
        borderRight: '1px solid rgba(63,63,70,0.5)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
      }}>
        {/* Sidebar Header */}
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid rgba(63,63,70,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '0.625rem',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
            }}>
              <Building2 size={18} style={{ color: '#fff' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#f4f4f5', letterSpacing: '-0.01em' }}>
                Portal Grupo
              </div>
              <div style={{ fontSize: '0.7rem', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Multiempresa
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.75rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '0.5rem', padding: '0 0.5rem' }}>
            Navegação
          </div>
          {SIDEBAR_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`sidebar-tab-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.75rem', borderRadius: '0.625rem', border: 'none',
                  background: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                  color: isActive ? '#60a5fa' : '#71717a',
                  cursor: 'pointer', textAlign: 'left', fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem', marginBottom: '0.125rem',
                  transition: 'all 0.2s', borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(39,39,42,0.6)';
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#71717a';
                }}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid rgba(63,63,70,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb44, #7c3aed44)', border: '1px solid rgba(63,63,70,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d4d4d8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.tenant}
              </div>
            </div>
          </div>
          <button
            id="btn-logout-portal"
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.1)'; }}
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>
        {/* Top Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(63,63,70,0.45)',
          padding: '0 2rem', height: '64px',
          display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f4f4f5', letterSpacing: '-0.01em' }}>
              {SIDEBAR_TABS.find((t) => t.id === activeTab)?.label}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#52525b' }}>
              {user.tenant}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d4d4d8' }}>{user.name}</div>
              <div style={{ fontSize: '0.65rem', color: '#52525b' }}>Gestor do Grupo</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '1.75rem 2rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          <div key={tabKey}>
            {activeTab === 'dashboard' && <TabDashboard />}
            {activeTab === 'estoque' && <TabEstoque />}
            {activeTab === 'produtos' && <TabProdutos />}
            {activeTab === 'transferencias' && <TabTransferencias />}
          </div>
        </main>
      </div>
    </div>
  );
}
