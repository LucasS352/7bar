import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import {
  BarChart2, Package, Tag, ArrowLeftRight, LogOut, Building2,
  TrendingUp, Star, Search, Plus, RefreshCw, X, AlertCircle,
  ChevronRight, Loader2, Activity, DollarSign, Store, Award,
  ArrowUp, ArrowDown, Clock, AlertTriangle, CheckCircle2,
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
interface DashboardData { groupId: string; groupName: string; tenants: TenantDashboard[]; }
interface StockCell { qty: number; productId: string; unit: string; }
interface StockRow { name: string; tenants: Record<string, StockCell>; }
interface StockData { groupId: string; tenantLabels: Record<string, string>; rows: StockRow[]; }
interface ProductRow { id: string; name: string; priceSell: number; priceCost: number; unit: string; stock: number; tenantId: string; tenantAlias: string; }
interface Transfer { id: string; from: string; to: string; product: string; qty: number; time: string; }

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPANY_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v ?? 0);
const fmtShort = (v: number) => { if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(1)}M`; if (v >= 1_000) return `R$ ${(v/1_000).toFixed(1)}k`; return fmt(v); };
function getToken(): string | null { try { return JSON.parse(localStorage.getItem('7bar-auth') || '{}')?.state?.token ?? null; } catch { return null; } }
function authHeaders(): Record<string, string> { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

// ─── Micro Components ─────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = '1rem', r = '0.5rem' }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#27272a 25%,#3f3f46 50%,#27272a 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />;
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: '999px', padding: '0.12rem 0.45rem' }}>{children}</span>;
}

function Pill({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem', fontWeight: 700, color: up ? '#4ade80' : '#f87171', background: up ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${up ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: '999px', padding: '0.12rem 0.45rem' }}>
      {up ? <ArrowUp size={9} /> : <ArrowDown size={9} />} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children, maxWidth = '520px' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#141416', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '1.25rem', padding: '2rem', width: '100%', maxWidth, boxShadow: '0 32px 80px rgba(0,0,0,0.9)', animation: 'slideUp 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f4f4f5' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '0.5rem', color: '#a1a1aa', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────

const IS: React.CSSProperties = { width: '100%', padding: '0.625rem 0.875rem', background: 'rgba(39,39,42,0.9)', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '0.625rem', color: '#f4f4f5', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', marginBottom: '1rem' };
const SS: React.CSSProperties = { ...IS, cursor: 'pointer', appearance: 'auto' };
const LS: React.CSSProperties = { fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.375rem', display: 'block', fontWeight: 600 };
function FF({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ marginBottom: '0.25rem' }}><label style={LS}>{label}</label>{children}</div>; }

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────────

function BarChart({ tenants, maxVal }: { tenants: TenantDashboard[]; maxVal: number }) {
  if (!tenants.length) return null;
  const BAR_H = 110;
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: `${BAR_H + 40}px`, padding: '0 0.5rem', minWidth: `${tenants.length * 80}px` }}>
        {tenants.map((t, i) => {
          const color = COMPANY_COLORS[i % COMPANY_COLORS.length];
          const barH = maxVal > 0 ? Math.max((t.salesMonth / maxVal) * BAR_H, 4) : 4;
          return (
            <div key={t.tenantId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>{fmtShort(t.salesMonth)}</div>
              <div style={{ width: '100%', maxWidth: '64px', background: `linear-gradient(to top, ${color}, ${color}88)`, borderRadius: '0.5rem 0.5rem 0 0', height: `${barH}px`, position: 'relative', overflow: 'hidden', transition: 'height 0.8s ease' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)' }} />
              </div>
              <div style={{ fontSize: '0.62rem', color: '#71717a', textAlign: 'center', maxWidth: '72px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.alias}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(20,20,22,0.95)', border: `1px solid ${color}28`, borderRadius: '1rem', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden', transition: 'all 0.2s', cursor: 'default' }}
      onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = 'translateY(-2px)'; d.style.boxShadow = `0 12px 40px ${color}20`; d.style.borderColor = `${color}50`; }}
      onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = ''; d.style.boxShadow = ''; d.style.borderColor = `${color}28`; }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}, ${color}44)` }} />
      <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '90px', height: '90px', borderRadius: '50%', background: `${color}06`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
        <div style={{ fontSize: '0.66rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
        <div style={{ width: '34px', height: '34px', borderRadius: '0.625rem', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.03em', marginBottom: '0.375rem', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#52525b' }}>{sub}</div>}
    </div>
  );
}

// ─── Store Card ───────────────────────────────────────────────────────────────

function StoreCard({ t, color, rank, totalToday }: { t: TenantDashboard; color: string; rank: number; totalToday: number }) {
  const pct = totalToday > 0 ? (t.salesToday / totalToday) * 100 : 0;
  const avgTicket = t.countToday > 0 ? t.salesToday / t.countToday : 0;
  return (
    <div style={{ background: 'rgba(20,20,22,0.95)', border: `1px solid ${color}25`, borderRadius: '1rem', padding: '1.25rem', overflow: 'hidden', position: 'relative', transition: 'all 0.25s' }}
      onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = 'translateY(-3px)'; d.style.boxShadow = `0 16px 48px ${color}20`; d.style.borderColor = `${color}50`; }}
      onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = ''; d.style.boxShadow = ''; d.style.borderColor = `${color}25`; }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '0.625rem', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0, fontWeight: 800, fontSize: '0.9rem' }}>
          {rank === 1 ? <Award size={17} /> : <span style={{ fontSize: '0.85rem' }}>{rank}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.alias}</div>
          <Badge color={color}>Ativa</Badge>
        </div>
        {rank === 1 && <Star size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
        {[
          { label: 'Hoje', value: fmt(t.salesToday), color: '#4ade80' },
          { label: 'Mês', value: fmt(t.salesMonth), color: '#60a5fa' },
          { label: 'Ticket Médio', value: fmt(avgTicket), color: '#a78bfa' },
          { label: 'Transações', value: fmtNum(t.countToday), color: '#fb923c' },
        ].map(m => (
          <div key={m.label} style={{ background: 'rgba(39,39,42,0.4)', border: '1px solid rgba(63,63,70,0.3)', borderRadius: '0.625rem', padding: '0.625rem 0.75rem' }}>
            <div style={{ fontSize: '0.58rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '0.2rem' }}>{m.label}</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.62rem', color: '#71717a' }}>Participação hoje</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color }}>{pct.toFixed(1)}%</span>
        </div>
        <div style={{ height: '5px', background: 'rgba(39,39,42,0.8)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: '999px', transition: 'width 1s ease' }} />
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
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/groups/my/dashboard', { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setLastRefresh(new Date());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: '#141416', border: '1px solid rgba(63,63,70,0.4)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton h="0.7rem" w="55%" /><Skeleton h="2.2rem" w="75%" /><Skeleton h="0.6rem" w="40%" />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', gap: '0.75rem', color: '#52525b' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.875rem' }}>Conectando às lojas do grupo...</span>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem', gap: '1rem', color: '#f87171' }}>
      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={26} /></div>
      <div style={{ fontWeight: 600 }}>Erro ao carregar dados</div>
      <div style={{ fontSize: '0.8rem', color: '#71717a' }}>{error}</div>
      <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.625rem', color: '#f87171', cursor: 'pointer', fontWeight: 600 }}>
        <RefreshCw size={14} /> Tentar novamente
      </button>
    </div>
  );

  if (!data) return null;

  const valid = data.tenants.filter(t => !t.error);
  const totalToday = valid.reduce((s, t) => s + t.salesToday, 0);
  const totalMonth = valid.reduce((s, t) => s + t.salesMonth, 0);
  const totalTxns = valid.reduce((s, t) => s + t.countToday, 0);
  const avgTicket = totalTxns > 0 ? totalToday / totalTxns : 0;
  const best = valid.reduce((b, t) => (!b || t.salesToday > b.salesToday ? t : b), valid[0]);
  const maxMonth = Math.max(...valid.map(t => t.salesMonth), 1);
  const sorted = [...valid].sort((a, b) => b.salesToday - a.salesToday);

  const productMap: Record<string, { name: string; qty: number }> = {};
  for (const t of valid) for (const p of t.topProducts) {
    if (productMap[p.productId]) productMap[p.productId].qty += p.totalQty;
    else productMap[p.productId] = { name: p.name, qty: p.totalQty };
  }
  const topProducts = Object.entries(productMap).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em' }}>{data.groupName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
            <span style={{ fontSize: '0.7rem', color: '#52525b' }}>{valid.length} loja{valid.length !== 1 ? 's' : ''} ativa{valid.length !== 1 ? 's' : ''} · Atualizado {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '0.625rem', color: '#60a5fa', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s' }}>
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1rem' }}>
        <KpiCard label="Vendas Hoje" value={fmt(totalToday)} sub={`${fmtNum(totalTxns)} transações`} color="#10b981" icon={<TrendingUp size={17} />} />
        <KpiCard label="Vendas do Mês" value={fmt(totalMonth)} sub="Acumulado do período" color="#3b82f6" icon={<BarChart2 size={17} />} />
        <KpiCard label="Ticket Médio" value={fmt(avgTicket)} sub="Média por transação" color="#8b5cf6" icon={<DollarSign size={17} />} />
        <KpiCard label="Destaque Hoje" value={best ? fmt(best.salesToday) : '—'} sub={best?.alias ?? ''} color="#f59e0b" icon={<Award size={17} />} />
      </div>

      {/* Store Cards */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
          <Store size={15} style={{ color: '#60a5fa' }} />
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#e4e4e7' }}>Desempenho por Loja</span>
          <span style={{ fontSize: '0.68rem', color: '#52525b', marginLeft: 'auto' }}>Ordenado por vendas hoje</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
          {sorted.map((t, i) => <StoreCard key={t.tenantId} t={t} color={COMPANY_COLORS[i % COMPANY_COLORS.length]} rank={i + 1} totalToday={totalToday} />)}
          {data.tenants.filter(t => t.error).map(t => (
            <div key={t.tenantId} style={{ background: 'rgba(20,20,22,0.8)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={14} style={{ color: '#f87171' }} /><span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f4f4f5' }}>{t.alias}</span></div>
              <div style={{ fontSize: '0.75rem', color: '#71717a' }}>Loja indisponível no momento</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart + Top Products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <BarChart2 size={15} style={{ color: '#3b82f6' }} />
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#e4e4e7' }}>Comparativo do Mês</span>
          </div>
          <BarChart tenants={valid} maxVal={maxMonth} />
        </div>
        <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Star size={15} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#e4e4e7' }}>Top Produtos do Grupo</span>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#52525b', fontSize: '0.875rem' }}>Sem dados de produtos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {topProducts.map(([pid, p], i) => {
                const color = COMPANY_COLORS[i % COMPANY_COLORS.length];
                const pct = (p.qty / topProducts[0][1].qty) * 100;
                return (
                  <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ width: '20px', textAlign: 'right', fontSize: '0.68rem', color: i < 3 ? color : '#52525b', fontWeight: 700, flexShrink: 0 }}>#{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#d4d4d8', fontWeight: 500 }}>{p.name}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{fmtNum(p.qty)} un</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(39,39,42,0.8)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}77)`, borderRadius: '999px', transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Estoque ─────────────────────────────────────────────────────────────

function TabEstoque() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [entryModal, setEntryModal] = useState(false);
  const [entryForm, setEntryForm] = useState({ tenantId: '', productId: '', quantity: '', costPrice: '' });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'ok'>('all');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/groups/my/stock', { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEntry = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/groups/my/stock-entry', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ tenantId: entryForm.tenantId, productId: entryForm.productId, quantity: Number(entryForm.quantity), costPrice: entryForm.costPrice ? Number(entryForm.costPrice) : undefined }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEntryModal(false); setEntryForm({ tenantId: '', productId: '', quantity: '', costPrice: '' });
      setSuccessMsg('Entrada registrada!'); setTimeout(() => setSuccessMsg(''), 3000); load();
    } catch (e: unknown) { alert(`Erro: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setSubmitting(false); }
  };

  const tenantIds = data ? Object.keys(data.tenantLabels) : [];

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(r => {
      if (!r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'low') { const qtys = tenantIds.map(tid => r.tenants[tid]?.qty ?? null).filter((q): q is number => q !== null); return qtys.some(q => q < 10); }
      if (filter === 'ok') { const qtys = tenantIds.map(tid => r.tenants[tid]?.qty ?? null).filter((q): q is number => q !== null); return qtys.every(q => q >= 10); }
      return true;
    });
  }, [data, search, filter, tenantIds]);

  const qtyColor = (q: number | null) => q === null ? '#52525b' : q < 3 ? '#f87171' : q < 10 ? '#fbbf24' : '#4ade80';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
          <input id="stock-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." style={{ ...IS, paddingLeft: '2.25rem', marginBottom: 0 }} />
        </div>
        {(['all', 'low', 'ok'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.5rem 0.875rem', background: filter === f ? 'rgba(59,130,246,0.15)' : 'rgba(39,39,42,0.6)', border: `1px solid ${filter === f ? 'rgba(59,130,246,0.4)' : 'rgba(63,63,70,0.6)'}`, borderRadius: '0.625rem', color: filter === f ? '#60a5fa' : '#71717a', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s' }}>
            {f === 'all' ? 'Todos' : f === 'low' ? '⚠ Estoque Baixo' : '✓ Estoque OK'}
          </button>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          {successMsg && <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}><CheckCircle2 size={13} /> {successMsg}</span>}
          <button onClick={load} style={{ padding: '0.55rem', background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '0.625rem', color: '#a1a1aa', cursor: 'pointer', display: 'flex' }}><RefreshCw size={13} /></button>
          <button id="btn-stock-entry" onClick={() => setEntryModal(true)} style={{ padding: '0.55rem 1rem', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', border: 'none', borderRadius: '0.625rem', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <Plus size={13} /> Entrada de Estoque
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', gap: '0.5rem', color: '#52525b' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /><span>Carregando estoque...</span></div>
      ) : error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem', color: '#f87171' }}>
          <AlertCircle size={36} /><div style={{ fontSize: '0.85rem' }}>{error}</div>
          <button onClick={load} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><RefreshCw size={13} /> Tentar novamente</button>
        </div>
      ) : data && (
        <>
          <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(39,39,42,0.4)', borderBottom: '1px solid rgba(63,63,70,0.6)' }}>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.68rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.07em', position: 'sticky', left: 0, background: '#1a1a1d', zIndex: 10, minWidth: '200px', fontWeight: 700 }}>Produto</th>
                    {tenantIds.map((tid, i) => (
                      <th key={tid} style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.68rem', color: COMPANY_COLORS[i % COMPANY_COLORS.length], textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: '130px', fontWeight: 700 }}>{data.tenantLabels[tid]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, ri) => (
                    <tr key={row.name} style={{ borderBottom: '1px solid rgba(39,39,42,0.4)', background: ri % 2 === 0 ? 'transparent' : 'rgba(39,39,42,0.1)', transition: 'background 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(59,130,246,0.05)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ri % 2 === 0 ? 'transparent' : 'rgba(39,39,42,0.1)'; }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#d4d4d8', position: 'sticky', left: 0, background: ri % 2 === 0 ? '#141416' : '#161618', zIndex: 5, fontWeight: 500 }}>{row.name}</td>
                      {tenantIds.map(tid => {
                        const cell = row.tenants[tid]; const qty = cell?.qty ?? null; const c = qtyColor(qty);
                        return (
                          <td key={tid} style={{ padding: '0.625rem 1rem', textAlign: 'center' }}>
                            {qty !== null ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.18rem 0.6rem', borderRadius: '999px', background: `${c}12`, border: `1px solid ${c}28`, fontSize: '0.8rem', fontWeight: 700, color: c }}>
                                {qty} {cell?.unit ?? ''}
                              </span>
                            ) : <span style={{ color: '#3f3f46' }}>—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={tenantIds.length + 1} style={{ padding: '3rem', textAlign: 'center', color: '#52525b', fontSize: '0.875rem' }}>Nenhum produto encontrado</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.7rem', color: '#71717a' }}>
            {[['#4ade80','Acima de 10'],['#fbbf24','Entre 3–10'],['#f87171','Abaixo de 3']].map(([c,l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, display: 'inline-block' }} />{l}</span>
            ))}
          </div>
        </>
      )}

      <Modal open={entryModal} onClose={() => setEntryModal(false)} title="Entrada de Estoque">
        <FF label="Empresa"><select id="entry-tenant" style={SS} value={entryForm.tenantId} onChange={e => setEntryForm(f => ({ ...f, tenantId: e.target.value }))}><option value="">— Selecione a empresa —</option>{data && Object.entries(data.tenantLabels).map(([tid, label]) => <option key={tid} value={tid}>{label}</option>)}</select></FF>
        <FF label="ID do Produto"><input id="entry-productId" style={IS} placeholder="productId" value={entryForm.productId} onChange={e => setEntryForm(f => ({ ...f, productId: e.target.value }))} /></FF>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <FF label="Quantidade"><input id="entry-qty" style={IS} type="number" min="1" placeholder="0" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))} /></FF>
          <FF label="Preço de Custo (opcional)"><input id="entry-cost" style={IS} type="number" step="0.01" placeholder="0.00" value={entryForm.costPrice} onChange={e => setEntryForm(f => ({ ...f, costPrice: e.target.value }))} /></FF>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button onClick={() => setEntryModal(false)} style={{ padding: '0.625rem 1rem', background: 'transparent', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '0.625rem', color: '#a1a1aa', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
          <button id="btn-entry-confirm" onClick={handleEntry} disabled={submitting} style={{ padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', border: 'none', borderRadius: '0.625rem', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json(); setProducts(json.products ?? []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleNew = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/groups/my/products', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...newForm, priceSell: Number(newForm.priceSell), priceCost: Number(newForm.priceCost) }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewModal(false); setNewForm({ name: '', priceSell: '', priceCost: '', unit: 'UN', categoryName: 'Geral' });
      setSuccessMsg('Produto criado em todas as lojas!'); setTimeout(() => setSuccessMsg(''), 3000); load();
    } catch (e: unknown) { alert(`Erro: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setSubmitting(false); }
  };

  const handlePrice = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/groups/my/products/price', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ productName: priceForm.productName, priceSell: Number(priceForm.priceSell) }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPriceModal(null); setPriceForm({ productName: '', priceSell: '' });
      setSuccessMsg('Preço atualizado em todas as lojas!'); setTimeout(() => setSuccessMsg(''), 3000); load();
    } catch (e: unknown) { alert(`Erro: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setSubmitting(false); }
  };

  const grouped = products.reduce<Record<string, ProductRow[]>>((acc, p) => { if (!acc[p.name]) acc[p.name] = []; acc[p.name].push(p); return acc; }, {});
  const productNames = Object.keys(grouped).filter(n => n.toLowerCase().includes(search.toLowerCase()));
  const tenantAliases = [...new Set(products.map(p => p.tenantAlias))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
          <input id="products-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." style={{ ...IS, paddingLeft: '2.25rem', marginBottom: 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          {successMsg && <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}><CheckCircle2 size={13} /> {successMsg}</span>}
          <button onClick={load} style={{ padding: '0.55rem', background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '0.625rem', color: '#a1a1aa', cursor: 'pointer', display: 'flex' }}><RefreshCw size={13} /></button>
          <button id="btn-new-product" onClick={() => setNewModal(true)} style={{ padding: '0.55rem 1rem', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', border: 'none', borderRadius: '0.625rem', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <Plus size={13} /> Novo em Todas
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', gap: '0.5rem', color: '#52525b' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /><span>Carregando produtos...</span></div>
      ) : error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem', color: '#f87171' }}>
          <AlertCircle size={36} /><div style={{ fontSize: '0.85rem' }}>{error}</div>
          <button onClick={load} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><RefreshCw size={13} /> Tentar novamente</button>
        </div>
      ) : (
        <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(39,39,42,0.4)', borderBottom: '1px solid rgba(63,63,70,0.6)' }}>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.68rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: '220px', fontWeight: 700 }}>Produto</th>
                  {tenantAliases.map((alias, i) => (
                    <th key={alias} style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.68rem', color: COMPANY_COLORS[i % COMPANY_COLORS.length], textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: '130px', fontWeight: 700 }}>{alias}</th>
                  ))}
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.68rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {productNames.map((name, ri) => {
                  const rows = grouped[name];
                  return (
                    <tr key={name} style={{ borderBottom: '1px solid rgba(39,39,42,0.4)', background: ri % 2 === 0 ? 'transparent' : 'rgba(39,39,42,0.1)', transition: 'background 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(59,130,246,0.05)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ri % 2 === 0 ? 'transparent' : 'rgba(39,39,42,0.1)'; }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#d4d4d8', fontWeight: 500 }}>{name}</td>
                      {tenantAliases.map(alias => {
                        const match = rows.find(r => r.tenantAlias === alias);
                        return <td key={alias} style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: match ? '#60a5fa' : '#3f3f46', fontWeight: match ? 600 : 400 }}>{match ? fmt(match.priceSell) : '—'}</td>;
                      })}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button id={`btn-price-${name.replace(/\s+/g,'-')}`} onClick={() => { const avg = rows.reduce((s, r) => s + r.priceSell, 0) / rows.length; setPriceForm({ productName: name, priceSell: avg.toFixed(2) }); setPriceModal({ name, price: avg }); }} style={{ padding: '0.35rem 0.75rem', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '0.5rem', color: '#60a5fa', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          Atualizar Preço
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {productNames.length === 0 && <tr><td colSpan={tenantAliases.length + 2} style={{ padding: '3rem', textAlign: 'center', color: '#52525b', fontSize: '0.875rem' }}>Nenhum produto encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={newModal} onClose={() => setNewModal(false)} title="Novo Produto — Todas as Lojas">
        <FF label="Nome do Produto"><input id="new-product-name" style={IS} value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Heineken 600ml" /></FF>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <FF label="Preço de Venda"><input id="new-product-price-sell" style={IS} type="number" step="0.01" min="0" value={newForm.priceSell} onChange={e => setNewForm(f => ({ ...f, priceSell: e.target.value }))} placeholder="0.00" /></FF>
          <FF label="Preço de Custo"><input id="new-product-price-cost" style={IS} type="number" step="0.01" min="0" value={newForm.priceCost} onChange={e => setNewForm(f => ({ ...f, priceCost: e.target.value }))} placeholder="0.00" /></FF>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <FF label="Unidade"><input id="new-product-unit" style={IS} value={newForm.unit} onChange={e => setNewForm(f => ({ ...f, unit: e.target.value }))} /></FF>
          <FF label="Categoria"><input id="new-product-category" style={IS} value={newForm.categoryName} onChange={e => setNewForm(f => ({ ...f, categoryName: e.target.value }))} /></FF>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button onClick={() => setNewModal(false)} style={{ padding: '0.625rem 1rem', background: 'transparent', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '0.625rem', color: '#a1a1aa', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
          <button id="btn-new-product-confirm" onClick={handleNew} disabled={submitting} style={{ padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', border: 'none', borderRadius: '0.625rem', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Criando…</> : <><Plus size={13} /> Criar em Todas</>}
          </button>
        </div>
      </Modal>

      <Modal open={!!priceModal} onClose={() => setPriceModal(null)} title={`Atualizar Preço — ${priceModal?.name ?? ''}`}>
        <FF label="Nome do Produto (exato)"><input id="update-price-name" style={IS} value={priceForm.productName} onChange={e => setPriceForm(f => ({ ...f, productName: e.target.value }))} /></FF>
        <FF label="Novo Preço de Venda"><input id="update-price-value" style={IS} type="number" step="0.01" min="0" value={priceForm.priceSell} onChange={e => setPriceForm(f => ({ ...f, priceSell: e.target.value }))} placeholder="0.00" /></FF>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button onClick={() => setPriceModal(null)} style={{ padding: '0.625rem 1rem', background: 'transparent', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '0.625rem', color: '#a1a1aa', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
          <button id="btn-update-price-confirm" onClick={handlePrice} disabled={submitting} style={{ padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', border: 'none', borderRadius: '0.625rem', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Atualizando…</> : 'Atualizar em Todas'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab: Transferências ──────────────────────────────────────────────────────

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStockData(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tenantIds = stockData ? Object.keys(stockData.tenantLabels) : [];
  const products = stockData ? stockData.rows.filter(r => form.fromTenantId ? r.tenants[form.fromTenantId] !== undefined : true).map(r => ({ name: r.name, productId: r.tenants[form.fromTenantId]?.productId ?? '' })).filter(p => p.productId) : [];

  const handleTransfer = async () => {
    if (!form.fromTenantId || !form.toTenantId || !form.productId || !form.quantity) { alert('Preencha todos os campos.'); return; }
    if (form.fromTenantId === form.toTenantId) { alert('Origem e destino não podem ser iguais.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/groups/my/stock-transfer', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ fromTenantId: form.fromTenantId, toTenantId: form.toTenantId, productId: form.productId, quantity: Number(form.quantity) }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fromLabel = stockData?.tenantLabels[form.fromTenantId] ?? form.fromTenantId;
      const toLabel = stockData?.tenantLabels[form.toTenantId] ?? form.toTenantId;
      const productName = stockData?.rows.find(r => r.tenants[form.fromTenantId]?.productId === form.productId)?.name ?? form.productId;
      setHistory(prev => [{ id: Date.now().toString(), from: fromLabel, to: toLabel, product: productName, qty: Number(form.quantity), time: new Date().toLocaleTimeString('pt-BR') }, ...prev].slice(0, 20));
      setForm({ fromTenantId: '', toTenantId: '', productId: '', quantity: '' });
      setSuccessMsg(`${form.quantity} unidades transferidas!`); setTimeout(() => setSuccessMsg(''), 4000); load();
    } catch (e: unknown) { alert(`Erro: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
      <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '0.625rem', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}><ArrowLeftRight size={16} /></div>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e4e4e7' }}>Nova Transferência</span>
        </div>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#52525b', padding: '1rem 0' }}><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: '0.85rem' }}>Carregando...</span></div>
        ) : error ? (
          <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</div>
        ) : (
          <>
            <FF label="De (Origem)">
              <select id="transfer-from" style={SS} value={form.fromTenantId} onChange={e => setForm(f => ({ ...f, fromTenantId: e.target.value, productId: '' }))}>
                <option value="">— Selecione a origem —</option>
                {tenantIds.map(tid => <option key={tid} value={tid}>{stockData!.tenantLabels[tid]}</option>)}
              </select>
            </FF>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '-0.5rem 0 0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}><ArrowDown size={14} /></div>
            </div>
            <FF label="Para (Destino)">
              <select id="transfer-to" style={SS} value={form.toTenantId} onChange={e => setForm(f => ({ ...f, toTenantId: e.target.value }))}>
                <option value="">— Selecione o destino —</option>
                {tenantIds.filter(tid => tid !== form.fromTenantId).map(tid => <option key={tid} value={tid}>{stockData!.tenantLabels[tid]}</option>)}
              </select>
            </FF>
            <FF label="Produto">
              <select id="transfer-product" style={SS} value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))} disabled={!form.fromTenantId}>
                <option value="">— Selecione o produto —</option>
                {products.map(p => <option key={p.productId} value={p.productId}>{p.name}</option>)}
              </select>
            </FF>
            <FF label="Quantidade">
              <input id="transfer-qty" style={IS} type="number" min="1" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </FF>
            {successMsg && (
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '0.625rem', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#4ade80', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={14} /> {successMsg}
              </div>
            )}
            <button id="btn-transfer-confirm" onClick={handleTransfer} disabled={submitting} style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', border: 'none', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
              {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Transferindo…</> : <><ArrowLeftRight size={16} /> Confirmar Transferência</>}
            </button>
          </>
        )}
      </div>

      <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '0.625rem', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}><Activity size={16} /></div>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e4e4e7' }}>Histórico da Sessão</span>
          {history.length > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#52525b' }}>{history.length} transferência{history.length !== 1 ? 's' : ''}</span>}
        </div>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#52525b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <ArrowLeftRight size={32} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '0.875rem' }}>Nenhuma transferência nesta sessão</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {history.map(h => (
              <div key={h.id} style={{ background: 'rgba(39,39,42,0.4)', border: '1px solid rgba(63,63,70,0.35)', borderRadius: '0.875rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '0.625rem', background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}><ArrowLeftRight size={15} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: '#d4d4d8', fontWeight: 500, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.product}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.7rem', color: '#71717a' }}>
                    <span style={{ color: '#60a5fa' }}>{h.from}</span><ChevronRight size={10} /><span style={{ color: '#4ade80' }}>{h.to}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>{h.qty} un</div>
                  <div style={{ fontSize: '0.62rem', color: '#52525b', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}><Clock size={9} /> {h.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Tabs ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2, color: '#3b82f6' },
  { id: 'estoque', label: 'Estoque', icon: Package, color: '#10b981' },
  { id: 'produtos', label: 'Produtos', icon: Tag, color: '#8b5cf6' },
  { id: 'transferencias', label: 'Transferências', icon: ArrowLeftRight, color: '#f59e0b' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GroupPortalPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [tabKey, setTabKey] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token || !user || (user.role !== 'group_owner' && !user.groupId)) navigate('/login', { replace: true });
  }, [user, navigate]);

  const handleTabChange = (id: TabId) => { setActiveTab(id); setTabKey(k => k + 1); };
  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  if (!user) return null;

  const activeTabDef = TABS.find(t => t.id === activeTab)!;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:rgba(39,39,42,0.3); }
        ::-webkit-scrollbar-thumb { background:rgba(63,63,70,0.7); border-radius:3px; }
        input:focus, select:focus { border-color:rgba(59,130,246,0.7) !important; box-shadow:0 0 0 3px rgba(59,130,246,0.12) !important; outline:none; }
        input::placeholder { color:#52525b; }
        select option { background:#1a1a1d; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: '220px', flexShrink: 0, background: '#0d0d0f', borderRight: '1px solid rgba(63,63,70,0.45)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 1.25rem 1.25rem', borderBottom: '1px solid rgba(63,63,70,0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(37,99,235,0.4)' }}>
              <Building2 size={17} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f4f4f5', letterSpacing: '-0.01em' }}>Portal Grupo</div>
              <div style={{ fontSize: '0.62rem', color: '#52525b' }}>Multi-Lojas</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <div style={{ fontSize: '0.58rem', color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.5rem', padding: '0 0.5rem' }}>Navegação</div>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} id={`sidebar-tab-${tab.id}`} onClick={() => handleTabChange(tab.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem', borderRadius: '0.625rem', border: 'none', background: isActive ? `${tab.color}15` : 'transparent', color: isActive ? tab.color : '#71717a', cursor: 'pointer', textAlign: 'left', fontWeight: isActive ? 700 : 500, fontSize: '0.85rem', transition: 'all 0.15s', position: 'relative' }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(39,39,42,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa'; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#71717a'; } }}>
                {isActive && <div style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: '3px', background: tab.color, borderRadius: '0 999px 999px 0' }} />}
                <Icon size={16} />{tab.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: '1rem 0.875rem', borderTop: '1px solid rgba(63,63,70,0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#d4d4d8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '0.6rem', color: '#52525b' }}>Gestor do Grupo</div>
            </div>
          </div>
          <button id="btn-logout-portal" onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.18)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.08)'; }}>
            <LogOut size={13} /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(9,9,11,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(63,63,70,0.4)', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '0.5rem', background: `${activeTabDef.color}18`, border: `1px solid ${activeTabDef.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeTabDef.color }}>
              <activeTabDef.icon size={14} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f4f4f5', letterSpacing: '-0.01em' }}>{activeTabDef.label}</div>
              <div style={{ fontSize: '0.62rem', color: '#52525b' }}>{user.tenant ?? 'Portal Grupo'}</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.68rem', color: '#52525b' }}>Online</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#d4d4d8' }}>{user.name}</div>
                <div style={{ fontSize: '0.6rem', color: '#52525b' }}>Gestor do Grupo</div>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            </div>
          </div>
        </header>
        <main style={{ flex: 1, padding: '1.75rem 2rem', maxWidth: '1400px', width: '100%', margin: '0 auto', paddingBottom: '3rem' }}>
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
