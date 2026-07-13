import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import {
  BarChart2, Package, Tag, ArrowLeftRight, LogOut, Building2,
  TrendingUp, Star, Search, Plus, RefreshCw, X, AlertCircle,
  Loader2, Activity, DollarSign, Store, Award,
  Clock, Calendar, ShoppingCart, Edit3, Check, AlertTriangle,
  RefreshCcw, ChevronDown, Copy, Trash2, Info, ArrowRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Cell, LabelList
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TenantDashboard {
  tenantId: string; alias: string; salesToday: number; salesMonth: number;
  countToday: number; topProducts: { productId: string; name: string; imageUrl?: string; totalQty: number }[];
  error?: string;
}
interface DashboardData {
  groupId: string; groupName: string; tenants: TenantDashboard[];
  salesByDate: { date: string; total: number }[];
  salesByHour: { hour: string; total: number }[];
  salesByDayOfWeek: { name: string; total: number }[];
  salesByWeek: { name: string; total: number }[];
  salesByMonth: { name: string; total: number }[];
  payments: { method: string; total: number }[];
}
interface StockCell { qty: number; productId: string; unit: string; }
interface StockRow { name: string; tenants: Record<string, StockCell>; }
interface StockData { groupId: string; tenantLabels: Record<string, string>; rows: StockRow[]; }
interface ForecastRow { productId: string; name: string; totalStock: number; avgDailySales: number; autonomyDays: number; suggestion: number; }
interface TenantDetail {
  tenantId: string; alias: string;
  recentSales: { id: string; total: number; createdAt: string; itemsCount: number; firstItems: string[]; payments: { method: string; label?: string; value: number }[] }[];
  criticalStock: { id: string; name: string; stock: number; unit: string }[];
}
interface CatalogRow { name: string; tenants: Record<string, { id: string; priceSell: number; priceCost: number; stock: number; unit: string; barcode?: string; ncm?: string; imageUrl?: string }>; }
interface CatalogData { groupId: string; groupName: string; tenantLabels: Record<string, string>; rows: CatalogRow[]; }
interface SyncStatus { groupId: string; tenantLabels: Record<string, string>; hasDifferences: boolean; missingProducts: { name: string; presentIn: string[]; missingIn: string[]; productData: any }[]; }

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPANY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v ?? 0);
function getToken(): string | null { try { return JSON.parse(localStorage.getItem('7bar-auth') || '{}')?.state?.token ?? null; } catch { return null; } }
function authHeaders(): Record<string, string> { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

const METHOD_DISPLAY: Record<string, string> = { dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Crédito', debito: 'Débito', outros: 'Outros' };

// ─── Micro Components ─────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = '1rem', r = '0.5rem' }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#27272a 25%,#3f3f46 50%,#27272a 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />;
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: '999px', padding: '0.12rem 0.45rem' }}>{children}</span>;
}

function Modal({ open, onClose, title, children, maxWidth = '520px' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#141416', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '1.25rem', padding: '2rem', width: '100%', maxWidth, boxShadow: '0 32px 80px rgba(0,0,0,0.9)', animation: 'slideUp 0.2s ease', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f4f4f5' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '0.5rem', color: '#a1a1aa', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const IS: React.CSSProperties = { width: '100%', padding: '0.625rem 0.875rem', background: 'rgba(39,39,42,0.9)', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '0.625rem', color: '#f4f4f5', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', marginBottom: '1rem' };
const SS: React.CSSProperties = { ...IS, cursor: 'pointer', appearance: 'auto' };
const LS: React.CSSProperties = { fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.375rem', display: 'block', fontWeight: 600 };
function FF({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ marginBottom: '0.25rem' }}><label style={LS}>{label}</label>{children}</div>; }

function Btn({ onClick, children, color = '#3b82f6', disabled = false, size = 'md', outline = false }: { onClick?: () => void; children: React.ReactNode; color?: string; disabled?: boolean; size?: 'sm' | 'md'; outline?: boolean }) {
  const pad = size === 'sm' ? '0.375rem 0.875rem' : '0.625rem 1.25rem';
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: pad, background: outline ? 'transparent' : disabled ? '#27272a' : color, border: `1px solid ${disabled ? '#3f3f46' : color}`, borderRadius: '0.625rem', color: disabled ? '#52525b' : outline ? color : '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: disabled ? 0.7 : 1 }}>
      {children}
    </button>
  );
}

function KpiCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(20,20,22,0.95)', border: `1px solid ${color}28`, borderRadius: '1rem', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}, ${color}44)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
        <div style={{ fontSize: '0.66rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
        <div style={{ width: '34px', height: '34px', borderRadius: '0.625rem', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.03em', marginBottom: '0.375rem', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#52525b' }}>{sub}</div>}
    </div>
  );
}

// ─── Tenant Detail Drawer ─────────────────────────────────────────────────────

function TenantDetailDrawer({ tenantId, tenantAlias, color, onClose }: { tenantId: string; tenantAlias: string; color: string; onClose: () => void }) {
  const [data, setData] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/groups/my/tenant-detail/${tenantId}`, { headers: authHeaders() })
      .then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [tenantId]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{ width: '480px', maxWidth: '95vw', background: '#0d0d0f', borderLeft: `1px solid ${color}30`, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', animation: 'slideFromRight 0.25s ease' }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: `1px solid ${color}20`, background: `${color}08` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 800, fontSize: '1.1rem' }}><Store size={20} /></div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f4f4f5' }}>{tenantAlias}</div>
                <Badge color={color}>Detalhes da Loja</Badge>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '0.5rem', color: '#a1a1aa', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#52525b' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.85rem' }}>Conectando à loja...</span>
          </div>
        ) : !data ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontSize: '0.85rem' }}>Erro ao carregar detalhes</div>
        ) : (
          <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Critical Stock */}
            {data.criticalStock.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  <AlertTriangle size={16} color="#ef4444" />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f87171' }}>Estoque Crítico ({data.criticalStock.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {data.criticalStock.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#e4e4e7', fontWeight: 600 }}>{p.name}</span>
                      <Badge color={p.stock <= 0 ? '#ef4444' : '#f59e0b'}>{p.stock} {p.unit}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sales */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                <Clock size={16} color="#60a5fa" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#e4e4e7' }}>Vendas Recentes</span>
              </div>
              {data.recentSales.length === 0 ? (
                <div style={{ color: '#52525b', fontSize: '0.8rem', textAlign: 'center', padding: '2rem' }}>Nenhuma venda recente</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {data.recentSales.map(s => (
                    <div key={s.id} style={{ background: 'rgba(39,39,42,0.4)', border: '1px solid rgba(63,63,70,0.4)', borderRadius: '0.75rem', padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.72rem', color: '#71717a', fontFamily: 'monospace' }}>{new Date(s.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span style={{ fontWeight: 800, color: '#4ade80', fontSize: '0.9rem' }}>{fmt(s.total)}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.4rem' }}>{s.firstItems.join(', ')}{s.itemsCount > 3 ? ` +${s.itemsCount - 3}` : ''}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {s.payments.map((p, i) => (
                          <span key={i} style={{ fontSize: '0.6rem', fontWeight: 700, color: '#60a5fa', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>
                            {p.label || METHOD_DISPLAY[p.method] || p.method}
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
      </div>
    </div>
  );
}

// ─── Store Card ───────────────────────────────────────────────────────────────

function StoreCard({ t, color, rank, totalToday, onClick }: { t: TenantDashboard; color: string; rank: number; totalToday: number; onClick: () => void }) {
  const pct = totalToday > 0 ? (t.salesToday / totalToday) * 100 : 0;
  const avgTicket = t.countToday > 0 ? t.salesMonth / t.countToday : 0;
  return (
    <div style={{ background: 'rgba(20,20,22,0.95)', border: `1px solid ${color}25`, borderRadius: '1rem', padding: '1.25rem', overflow: 'hidden', position: 'relative', transition: 'all 0.25s', cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = 'translateY(-3px)'; d.style.boxShadow = `0 16px 48px ${color}20`; d.style.borderColor = `${color}60`; }}
      onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = ''; d.style.boxShadow = ''; d.style.borderColor = `${color}25`; }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '0.625rem', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0, fontWeight: 800 }}>
          {rank === 1 ? <Award size={17} /> : <span style={{ fontSize: '0.85rem' }}>{rank}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.alias}</div>
          <Badge color={color}>Ativa</Badge>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#52525b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <ArrowRight size={11} /> Ver detalhes
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
        {[
          { label: 'Hoje', value: fmt(t.salesToday), color: '#4ade80' },
          { label: 'Período', value: fmt(t.salesMonth), color: '#60a5fa' },
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

function TabDashboard({ dateFilter }: { dateFilter: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartGrouping, setChartGrouping] = useState<'hour' | 'day' | 'week' | 'month'>('hour');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedTenant, setSelectedTenant] = useState<{ id: string; alias: string; color: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      let q = '';
      const now = new Date();
      if (dateFilter === '7d') { const d = new Date(); d.setDate(d.getDate() - 7); q = `?startDate=${d.toISOString()}&endDate=${now.toISOString()}`; }
      else if (dateFilter === '30d') { const d = new Date(); d.setDate(d.getDate() - 30); q = `?startDate=${d.toISOString()}&endDate=${now.toISOString()}`; }
      else if (dateFilter === 'hoje') { const d = new Date(); d.setHours(0, 0, 0, 0); q = `?startDate=${d.toISOString()}&endDate=${now.toISOString()}`; }
      const res = await fetch(`/api/groups/my/dashboard${q}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setLastRefresh(new Date());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1rem' }}>
        {[...Array(4)].map((_, i) => (<div key={i} style={{ background: '#141416', border: '1px solid rgba(63,63,70,0.4)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}><Skeleton h="0.7rem" w="55%" /><Skeleton h="2.2rem" w="75%" /><Skeleton h="0.6rem" w="40%" /></div>))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', gap: '0.75rem', color: '#52525b' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.875rem' }}>Conectando às lojas...</span>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem', gap: '1rem', color: '#f87171' }}>
      <AlertCircle size={36} />
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
  const avgTicket = totalTxns > 0 ? totalMonth / totalTxns : 0;
  const best = valid.reduce((b, t) => (!b || t.salesMonth > b.salesMonth ? t : b), valid[0]);
  const sorted = [...valid].sort((a, b) => b.salesToday - a.salesToday);

  const productMap: Record<string, { name: string; qty: number; imageUrl?: string }> = {};
  for (const t of data.tenants) {
    for (const p of t.topProducts) {
      if (productMap[p.productId]) productMap[p.productId].qty += p.totalQty;
      else productMap[p.productId] = { name: p.name, qty: p.totalQty, imageUrl: p.imageUrl };
    }
  }
  const topProducts = Object.entries(productMap).sort((a, b) => b[1].qty - a[1].qty).slice(0, 15);

  let activeChartData: { name: string; total: number }[] = [];
  if (chartGrouping === 'hour') activeChartData = data.salesByHour?.map(d => ({ name: d.hour, total: d.total })) || [];
  else if (chartGrouping === 'day') activeChartData = data.salesByDate?.map(d => ({ name: d.date.split('-').slice(1).reverse().join('/'), total: d.total })) || [];
  else if (chartGrouping === 'week') activeChartData = data.salesByWeek || [];
  else if (chartGrouping === 'month') activeChartData = data.salesByMonth || [];

  const maxTotal = activeChartData.reduce((max, item) => (item.total > max ? item.total : max), 0);
  const chartDataWithPeak = activeChartData.map(item => ({ ...item, isPeak: maxTotal > 0 && item.total === maxTotal }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (<div style={{ background: '#18181b', border: '1px solid rgba(63,63,70,0.8)', padding: '0.75rem', borderRadius: '0.5rem' }}><div style={{ color: '#a1a1aa', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{label}</div><div style={{ color: '#4ade80', fontWeight: 700 }}>{fmt(payload[0].value)}</div></div>);
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', animation: 'fadeIn 0.3s ease' }}>
      {selectedTenant && (
        <TenantDetailDrawer tenantId={selectedTenant.id} tenantAlias={selectedTenant.alias} color={selectedTenant.color} onClose={() => setSelectedTenant(null)} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f4f4f5' }}>{data.groupName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
            <span style={{ fontSize: '0.7rem', color: '#52525b' }}>{valid.length} lojas · Atualizado {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '0.625rem', color: '#60a5fa', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <KpiCard label="Vendas Hoje" value={fmt(totalToday)} sub={`${valid.length} lojas operando`} color="#4ade80" icon={<TrendingUp />} />
        <KpiCard label="Total do Período" value={fmt(totalMonth)} sub="Acumulado" color="#60a5fa" icon={<BarChart2 />} />
        <KpiCard label="Ticket Médio" value={fmt(avgTicket)} sub="Média por transação" color="#a78bfa" icon={<DollarSign />} />
        {best && <KpiCard label="Destaque no Período" value={fmt(best.salesMonth)} sub={best.alias} color="#f59e0b" icon={<Award />} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Store size={18} color="#60a5fa" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e4e4e7' }}>Desempenho por Loja</span>
          <span style={{ fontSize: '0.68rem', color: '#52525b', marginLeft: '0.25rem' }}>• clique para ver detalhes</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {sorted.map((t, i) => (
            <StoreCard key={t.tenantId} t={t} color={COMPANY_COLORS[i % COMPANY_COLORS.length]} rank={i + 1} totalToday={totalToday}
              onClick={() => setSelectedTenant({ id: t.tenantId, alias: t.alias, color: COMPANY_COLORS[i % COMPANY_COLORS.length] })} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.4)', borderRadius: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#60a5fa' }}>
              <Activity size={18} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e4e4e7' }}>Evolução de Vendas (Grupo)</span>
            </div>
            {data.salesByDate.length > 0 ? (
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.salesByDate} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')} />
                    <YAxis stroke="#52525b" fontSize={10} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: '0.85rem' }}>Sem vendas no período</div>}
          </div>

          <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.4)', borderRadius: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
                <Clock size={18} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e4e4e7' }}>Vendas por {chartGrouping === 'hour' ? 'Hora' : chartGrouping === 'day' ? 'Dia' : chartGrouping === 'week' ? 'Semana' : 'Mês'}</span>
              </div>
              <div style={{ display: 'flex', background: '#09090b', border: '1px solid rgba(63,63,70,0.4)', padding: '0.25rem', borderRadius: '0.75rem' }}>
                {(['hour', 'day', 'week', 'month'] as const).map((g) => (
                  <button key={g} onClick={() => setChartGrouping(g)} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: chartGrouping === g ? '#2563eb' : 'transparent', color: chartGrouping === g ? '#fff' : '#a1a1aa' }}>
                    {g === 'hour' ? 'Hora' : g === 'day' ? 'Dia' : g === 'week' ? 'Semana' : 'Mês'}
                  </button>
                ))}
              </div>
            </div>
            {chartDataWithPeak.length > 0 ? (
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataWithPeak} margin={{ top: 35, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBarPeak" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={1} /><stop offset="100%" stopColor="#d97706" stopOpacity={0.8} /></linearGradient>
                      <linearGradient id="colorBarNormal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={1} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : Math.round(val)}`} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#18181b', border: '1px solid rgba(63,63,70,0.8)', borderRadius: '0.75rem' }} formatter={(value: number) => [fmt(value), 'Faturamento']} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {chartDataWithPeak.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.isPeak ? 'url(#colorBarPeak)' : 'url(#colorBarNormal)'} />))}
                      {chartDataWithPeak.length <= 14 && <LabelList dataKey="total" position="top" fill="#e4e4e7" fontSize={11} fontWeight={700} formatter={(val: number) => val >= 1000 ? 'R$ ' + (val / 1000).toFixed(1) + 'k' : 'R$ ' + Math.round(val)} />}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: '0.85rem' }}>Sem dados</div>}
          </div>

          <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.4)', borderRadius: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#10b981' }}>
              <DollarSign size={18} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e4e4e7' }}>Meios de Pagamento</span>
            </div>
            {data.payments?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.payments.slice().sort((a, b) => b.total - a.total).map((entry, index) => {
                  const totalAll = data.payments.reduce((acc, curr) => acc + curr.total, 0);
                  const pct = ((entry.total / totalAll) * 100).toFixed(1);
                  const color = COMPANY_COLORS[index % COMPANY_COLORS.length];
                  return (
                    <div key={entry.method} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                          <span style={{ color: '#d4d4d8', fontWeight: 600 }}>{METHOD_DISPLAY[entry.method] || entry.method}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <span style={{ color: '#a1a1aa' }}>{pct}%</span>
                          <span style={{ color, fontWeight: 700 }}>{fmt(entry.total)}</span>
                        </div>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(39,39,42,0.8)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: '999px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div style={{ padding: '2rem', textAlign: 'center', color: '#52525b', fontSize: '0.85rem' }}>Sem dados de pagamento</div>}
          </div>
        </div>

        <div style={{ flex: '0 0 400px', background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.4)', borderRadius: '1rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#f59e0b' }}>
            <Star size={18} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e4e4e7' }}>Top Produtos — Consolidado</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {topProducts.map(([id, p], i) => {
              const maxQ = topProducts[0][1].qty;
              const pct = (p.qty / maxQ) * 100;
              const color = COMPANY_COLORS[i % COMPANY_COLORS.length];
              return (
                <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#71717a', fontWeight: 600, width: '16px' }}>#{i + 1}</span>
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} /> : <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'rgba(63,63,70,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={12} color="#a1a1aa" /></div>}
                      <span style={{ color: '#d4d4d8', fontWeight: 600 }}>{p.name}</span>
                    </div>
                    <span style={{ color, fontWeight: 700 }}>{fmtNum(p.qty)} un</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(39,39,42,0.8)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: '999px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Forecast ─────────────────────────────────────────────────────────────

function TabForecast() {
  const [data, setData] = useState<ForecastRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(15);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/groups/my/purchase-forecast?daysToForecast=${days}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="#f43f5e" /> Previsão de Compras (Inteligente)
          </h2>
          <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '0.375rem' }}>Média de vendas dos últimos 30 dias cruzada com estoque atual.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#18181b', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, paddingLeft: '0.5rem' }}>Alvo:</span>
          <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ background: '#27272a', border: 'none', color: '#f4f4f5', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', outline: 'none', cursor: 'pointer' }}>
            <option value={7}>7 Dias</option><option value={15}>15 Dias</option><option value={30}>30 Dias</option>
          </select>
        </div>
      </div>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#52525b' }} /></div>
        : error ? <div style={{ color: '#f87171', padding: '2rem', textAlign: 'center' }}>{error}</div>
          : (
            <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(39,39,42,0.4)', borderBottom: '1px solid rgba(63,63,70,0.5)' }}>
                      {['Produto', 'Estoque Global', 'Venda Média / Dia', 'Autonomia', 'Sugestão (Comprar)'].map(h => (
                        <th key={h} style={{ padding: '1rem', fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Sugestão (Comprar)' ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data!.map(row => {
                      const critical = row.autonomyDays < 3;
                      const warning = row.autonomyDays >= 3 && row.autonomyDays <= 7;
                      return (
                        <tr key={row.productId} style={{ borderBottom: '1px solid rgba(63,63,70,0.3)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(39,39,42,0.4)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#e4e4e7' }}>{row.name}</td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#a1a1aa' }}>{row.totalStock} un</td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600 }}>{row.avgDailySales} un/dia</td>
                          <td style={{ padding: '1rem' }}>{critical ? <Badge color="#ef4444">{row.autonomyDays} dias</Badge> : warning ? <Badge color="#f59e0b">{row.autonomyDays} dias</Badge> : <Badge color="#10b981">{row.autonomyDays === 999 ? 'Muito' : `${row.autonomyDays} dias`}</Badge>}</td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>{row.suggestion > 0 ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', padding: '0.3rem 0.75rem', borderRadius: '0.5rem', color: '#f43f5e', fontWeight: 800, fontSize: '0.85rem' }}><ShoppingCart size={14} />+{row.suggestion}</div> : <span style={{ fontSize: '0.8rem', color: '#52525b' }}>OK</span>}</td>
                        </tr>
                      );
                    })}
                    {data!.length === 0 && <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#71717a' }}>Sem dados suficientes.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
    </div>
  );
}

// ─── Tab: Estoque ─────────────────────────────────────────────────────────────

function TabEstoque() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'ok'>('all');
  const [editingCell, setEditingCell] = useState<{ name: string; tenantId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedToSync, setSelectedToSync] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState(false);

  const loadStock = () => {
    setLoading(true);
    fetch('/api/groups/my/stock', { headers: authHeaders() })
      .then(r => r.json()).then(setData).finally(() => setLoading(false));
  };

  const loadSyncStatus = () => {
    setLoadingSync(true);
    fetch('/api/groups/my/products/sync-status', { headers: authHeaders() })
      .then(r => r.json()).then(d => { setSyncStatus(d); }).finally(() => setLoadingSync(false));
  };

  useEffect(() => { loadStock(); loadSyncStatus(); }, []);

  const startEdit = (name: string, tenantId: string, currentQty: number) => {
    setEditingCell({ name, tenantId });
    setEditValue(String(currentQty));
  };

  const saveEdit = async () => {
    if (!editingCell || !data) return;
    const row = data.rows.find(r => r.name === editingCell.name);
    const cell = row?.tenants[editingCell.tenantId];
    if (!cell) return;
    setSaving(true);
    try {
      const res = await fetch('/api/groups/my/stock-adjust', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ tenantId: editingCell.tenantId, productId: cell.productId, newStock: parseFloat(editValue) }) });
      if (!res.ok) throw new Error('Erro ao salvar');
      // Update local state
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map(r => r.name === editingCell!.name ? {
            ...r, tenants: {
              ...r.tenants,
              [editingCell!.tenantId]: { ...r.tenants[editingCell!.tenantId], qty: parseFloat(editValue) }
            }
          } : r)
        };
      });
      setEditingCell(null);
    } catch (e) {
      alert('Erro ao salvar estoque');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncSubmit = async () => {
    if (!syncStatus) return;
    const products = syncStatus.missingProducts
      .filter(p => selectedToSync[p.name])
      .map(p => ({ name: p.name, targetTenantIds: p.missingIn }));
    if (products.length === 0) return;
    setSyncing(true);
    try {
      await fetch('/api/groups/my/products/sync', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ products }) });
      setShowSyncModal(false);
      loadStock();
      loadSyncStatus();
    } catch {
      alert('Erro ao sincronizar produtos');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#71717a' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} /></div>;
  if (!data) return null;

  const filtered = data.rows.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMode !== 'all') {
      const hasLow = Object.values(r.tenants).some(t => t.qty < 3);
      if (filterMode === 'low' && !hasLow) return false;
      if (filterMode === 'ok' && hasLow) return false;
    }
    return true;
  });

  const hasDiff = syncStatus?.hasDifferences && syncStatus.missingProducts.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Sync Products Modal */}
      <Modal open={showSyncModal} onClose={() => setShowSyncModal(false)} title="Sincronizar Produtos" maxWidth="680px">
        <div style={{ fontSize: '0.82rem', color: '#a1a1aa', marginBottom: '1.25rem' }}>
          Os produtos abaixo existem em algumas lojas, mas não em todas. Selecione quais deseja replicar para as lojas faltantes.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto', marginBottom: '1.5rem' }}>
          {syncStatus?.missingProducts.map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(39,39,42,0.4)', border: '1px solid rgba(63,63,70,0.4)', borderRadius: '0.75rem', padding: '0.875rem 1rem', cursor: 'pointer' }} onClick={() => setSelectedToSync(prev => ({ ...prev, [p.name]: !prev[p.name] }))}>
              <input type="checkbox" checked={!!selectedToSync[p.name]} onChange={() => {}} style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#f4f4f5', fontSize: '0.85rem' }}>{p.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '0.2rem' }}>
                  Presente em: {p.presentIn.map(id => syncStatus?.tenantLabels[id]).join(', ')} →
                  Faltando em: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{p.missingIn.map(id => syncStatus?.tenantLabels[id]).join(', ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Btn onClick={() => setShowSyncModal(false)} color="#52525b" outline>Cancelar</Btn>
          <Btn onClick={handleSyncSubmit} color="#10b981" disabled={syncing || Object.values(selectedToSync).filter(Boolean).length === 0}>
            {syncing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCcw size={14} />}
            Sincronizar Selecionados
          </Btn>
        </div>
      </Modal>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Controle de Estoque</h2>
          <span style={{ fontSize: '0.72rem', color: '#71717a' }}>Clique na quantidade para editar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Sync Button */}
          {loadingSync ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#52525b' }}><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> verificando...</div>
          ) : (
            <button
              onClick={() => { if (hasDiff) { setSelectedToSync({}); setShowSyncModal(true); } else { loadSyncStatus(); } }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: hasDiff ? 'rgba(16,185,129,0.12)' : 'rgba(39,39,42,0.5)', border: `1px solid ${hasDiff ? '#10b981' : 'rgba(63,63,70,0.5)'}`, borderRadius: '0.625rem', color: hasDiff ? '#10b981' : '#71717a', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: hasDiff ? '0 0 12px rgba(16,185,129,0.2)' : 'none' }}>
              <RefreshCcw size={14} />
              {hasDiff ? `Sincronizar Produtos (${syncStatus!.missingProducts.length} diferenças)` : 'Produtos Sincronizados'}
            </button>
          )}

          <div style={{ display: 'flex', background: 'rgba(39,39,42,0.8)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid rgba(63,63,70,0.5)' }}>
            {(['all', 'low', 'ok'] as const).map(m => (
              <button key={m} onClick={() => setFilterMode(m)} style={{ padding: '0.375rem 0.875rem', background: filterMode === m ? '#3f3f46' : 'transparent', border: 'none', borderRadius: '0.375rem', color: filterMode === m ? '#f4f4f5' : '#a1a1aa', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                {m === 'all' ? 'Todos' : m === 'low' ? 'Baixo' : 'Estoque OK'}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
            <input type="text" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...IS, marginBottom: 0, paddingLeft: '2.25rem', width: '220px' }} />
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'rgba(39,39,42,0.4)', borderBottom: '1px solid rgba(63,63,70,0.5)' }}>
                <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Produto</th>
                {Object.entries(data.tenantLabels).map(([id, l]) => <th key={id} style={{ padding: '1rem', fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', textAlign: 'center' }}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.name} style={{ borderBottom: '1px solid rgba(63,63,70,0.3)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(39,39,42,0.4)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{r.name}</td>
                  {Object.keys(data.tenantLabels).map(tid => {
                    const c = r.tenants[tid];
                    const isEditing = editingCell?.name === r.name && editingCell?.tenantId === tid;
                    if (!c) return <td key={tid} style={{ padding: '1rem', textAlign: 'center', color: '#52525b' }}>-</td>;
                    return (
                      <td key={tid} style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            <input
                              type="number" step="0.001" autoFocus value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                              style={{ width: '80px', padding: '0.3rem 0.5rem', background: '#18181b', border: '1px solid #3b82f6', borderRadius: '0.4rem', color: '#f4f4f5', fontSize: '0.82rem', outline: 'none', textAlign: 'center' }}
                            />
                            <button onClick={saveEdit} disabled={saving} style={{ background: '#10b981', border: 'none', borderRadius: '0.35rem', color: '#fff', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {saving ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
                            </button>
                            <button onClick={() => setEditingCell(null)} style={{ background: '#3f3f46', border: 'none', borderRadius: '0.35rem', color: '#a1a1aa', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', group: 'stock-cell' } as any} onClick={() => startEdit(r.name, tid, c.qty)} title="Clique para editar">
                            <Badge color={c.qty < 0 ? '#ef4444' : c.qty < 3 ? '#f59e0b' : '#10b981'}>{c.qty} {c.unit}</Badge>
                            <Edit3 size={11} color="#52525b" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={Object.keys(data.tenantLabels).length + 1} style={{ padding: '3rem', textAlign: 'center', color: '#71717a' }}>Nenhum produto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Produtos ─────────────────────────────────────────────────────────────

function TabProdutos() {
  const [subTab, setSubTab] = useState<'catalog' | 'create'>('catalog');
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [search, setSearch] = useState('');
  const [editingPrice, setEditingPrice] = useState<{ name: string; tenantId: string } | null>(null);
  const [priceValue, setPriceValue] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [equalizeModal, setEqualizeModal] = useState<string | null>(null);
  const [equalizePrice, setEqualizePrice] = useState('');

  // Create form
  const [form, setForm] = useState({ name: '', barcode: '', ncm: '', unit: 'UN', categoryName: 'Geral', priceCost: '' });
  const [tenantPrices, setTenantPrices] = useState<Record<string, string>>({});
  const [selectedTenants, setSelectedTenants] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  const loadCatalog = () => {
    setLoadingCatalog(true);
    fetch('/api/groups/my/products-catalog', { headers: authHeaders() })
      .then(r => r.json()).then(d => { setCatalog(d); const tids = Object.keys(d.tenantLabels); setSelectedTenants(Object.fromEntries(tids.map(t => [t, true]))); setTenantPrices(Object.fromEntries(tids.map(t => [t, '']))); })
      .finally(() => setLoadingCatalog(false));
  };

  useEffect(() => { loadCatalog(); }, []);

  const savePricePerTenant = async (productName: string, tenantId: string, price: number) => {
    setSavingPrice(true);
    try {
      await fetch('/api/groups/my/products/price-per-tenant', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ productName, updates: [{ tenantId, priceSell: price }] }) });
      setCatalog(prev => {
        if (!prev) return prev;
        return { ...prev, rows: prev.rows.map(r => r.name === productName ? { ...r, tenants: { ...r.tenants, [tenantId]: { ...r.tenants[tenantId], priceSell: price } } } : r) };
      });
      setEditingPrice(null);
    } catch { alert('Erro ao salvar preço'); }
    finally { setSavingPrice(false); }
  };

  const equalizePrice = async (productName: string, price: number) => {
    if (!catalog) return;
    setSavingPrice(true);
    try {
      const updates = Object.keys(catalog.tenantLabels).map(t => ({ tenantId: t, priceSell: price }));
      await fetch('/api/groups/my/products/price-per-tenant', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ productName, updates }) });
      setCatalog(prev => {
        if (!prev) return prev;
        return { ...prev, rows: prev.rows.map(r => r.name === productName ? { ...r, tenants: Object.fromEntries(Object.entries(r.tenants).map(([tid, t]) => [tid, { ...t, priceSell: price }])) } : r) };
      });
      setEqualizeModal(null);
    } catch { alert('Erro ao equalizar preços'); }
    finally { setSavingPrice(false); }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.priceCost) { setCreateMsg('Nome e preço de custo são obrigatórios.'); return; }
    const prices = Object.entries(selectedTenants).filter(([, v]) => v).map(([tid]) => ({ tenantId: tid, priceSell: parseFloat(tenantPrices[tid] || '0') }));
    if (prices.length === 0) { setCreateMsg('Selecione pelo menos uma loja.'); return; }
    setCreating(true); setCreateMsg('');
    try {
      const res = await fetch('/api/groups/my/products/create-in-tenants', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...form, priceCost: parseFloat(form.priceCost), tenantPrices: prices }) });
      const data = await res.json();
      const success = data.results?.filter((r: any) => r.success).length || 0;
      setCreateMsg(`✅ Produto criado em ${success} loja(s)!`);
      setForm({ name: '', barcode: '', ncm: '', unit: 'UN', categoryName: 'Geral', priceCost: '' });
      loadCatalog();
    } catch { setCreateMsg('❌ Erro ao criar produto.'); }
    finally { setCreating(false); }
  };

  const tids = catalog ? Object.keys(catalog.tenantLabels) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Equalize Modal */}
      <Modal open={!!equalizeModal} onClose={() => setEqualizeModal(null)} title={`Equalizar Preço — ${equalizeModal}`}>
        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Define o mesmo preço de venda para <strong style={{ color: '#f4f4f5' }}>todas as lojas</strong>.</p>
        <FF label="Novo Preço de Venda (todas as lojas)">
          <input type="number" step="0.01" min="0" placeholder="Ex: 15.90" value={equalizePrice} onChange={e => setEqualizePrice(e.target.value)} style={IS} autoFocus />
        </FF>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Btn onClick={() => setEqualizeModal(null)} color="#52525b" outline>Cancelar</Btn>
          <Btn onClick={() => equalizePrice && equalizeModal && equalizePrice(equalizeModal, parseFloat(equalizePrice))} color="#3b82f6" disabled={!equalizePrice || savingPrice}>
            {savingPrice ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            Equalizar
          </Btn>
        </div>
      </Modal>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid rgba(63,63,70,0.5)', paddingBottom: '1rem' }}>
        {[{ id: 'catalog' as const, label: 'Catálogo do Grupo', icon: Tag }, { id: 'create' as const, label: 'Criar Produto', icon: Plus }].map(st => (
          <button key={st.id} onClick={() => setSubTab(st.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: 'none', background: 'transparent', color: subTab === st.id ? '#a78bfa' : '#71717a', fontWeight: subTab === st.id ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', borderBottom: subTab === st.id ? '2px solid #a78bfa' : '2px solid transparent', transition: 'all 0.2s', marginBottom: '-1rem' }}>
            <st.icon size={16} />{st.label}
          </button>
        ))}
      </div>

      {/* Catalog Sub-tab */}
      {subTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.82rem', color: '#71717a' }}>
              {catalog ? `${catalog.rows.length} produtos` : '...'} • Clique no preço para editar por loja
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                <input type="text" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...IS, marginBottom: 0, paddingLeft: '2.25rem', width: '220px' }} />
              </div>
              <button onClick={loadCatalog} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem', background: 'transparent', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '0.625rem', color: '#71717a', cursor: 'pointer', fontSize: '0.78rem' }}>
                <RefreshCw size={13} /> Atualizar
              </button>
            </div>
          </div>
          {loadingCatalog ? <div style={{ padding: '4rem', textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#52525b' }} /></div>
            : !catalog ? null
              : (
                <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(39,39,42,0.4)', borderBottom: '1px solid rgba(63,63,70,0.5)' }}>
                          <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Produto</th>
                          {tids.map(tid => (
                            <th key={tid} style={{ padding: '1rem', fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', textAlign: 'center' }}>
                              {catalog.tenantLabels[tid]}<div style={{ fontSize: '0.6rem', fontWeight: 400, color: '#52525b' }}>Preço de Venda</div>
                            </th>
                          ))}
                          <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.rows.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase())).map(row => (
                          <tr key={row.name} style={{ borderBottom: '1px solid rgba(63,63,70,0.3)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(39,39,42,0.3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f4f4f5' }}>{row.name}</div>
                              {Object.values(row.tenants)[0]?.ncm && <div style={{ fontSize: '0.65rem', color: '#52525b' }}>NCM: {Object.values(row.tenants)[0].ncm}</div>}
                            </td>
                            {tids.map(tid => {
                              const cell = row.tenants[tid];
                              const isEditing = editingPrice?.name === row.name && editingPrice?.tenantId === tid;
                              if (!cell) return <td key={tid} style={{ padding: '0.875rem 1rem', textAlign: 'center', color: '#3f3f46', fontSize: '0.75rem' }}>—</td>;
                              return (
                                <td key={tid} style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
                                  {isEditing ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <input type="number" step="0.01" autoFocus value={priceValue} onChange={e => setPriceValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') savePricePerTenant(row.name, tid, parseFloat(priceValue)); if (e.key === 'Escape') setEditingPrice(null); }} style={{ width: '80px', padding: '0.3rem 0.5rem', background: '#18181b', border: '1px solid #a78bfa', borderRadius: '0.4rem', color: '#f4f4f5', fontSize: '0.82rem', outline: 'none', textAlign: 'center' }} />
                                      <button onClick={() => savePricePerTenant(row.name, tid, parseFloat(priceValue))} disabled={savingPrice} style={{ background: '#10b981', border: 'none', borderRadius: '0.35rem', color: '#fff', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{savingPrice ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={11} />}</button>
                                      <button onClick={() => setEditingPrice(null)} style={{ background: '#3f3f46', border: 'none', borderRadius: '0.35rem', color: '#a1a1aa', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }} onClick={() => { setEditingPrice({ name: row.name, tenantId: tid }); setPriceValue(String(cell.priceSell)); }} title="Clique para editar preço">
                                      <span style={{ fontWeight: 700, color: '#a78bfa', fontSize: '0.875rem' }}>{fmt(cell.priceSell)}</span>
                                      <Edit3 size={11} color="#52525b" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                              <button onClick={() => { setEqualizeModal(row.name); setEqualizePrice(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.75rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '0.5rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>
                                <Copy size={11} /> Equalizar
                              </button>
                            </td>
                          </tr>
                        ))}
                        {catalog.rows.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                          <tr><td colSpan={tids.length + 2} style={{ padding: '3rem', textAlign: 'center', color: '#71717a' }}>Nenhum produto encontrado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
        </div>
      )}

      {/* Create Sub-tab */}
      {subTab === 'create' && catalog && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 700, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Tag size={16} color="#a78bfa" /> Dados do Produto</h3>
            <FF label="Nome do Produto *"><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={IS} placeholder="Ex: Heineken Lata 350ml" /></FF>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <FF label="Código de Barras (EAN)"><input value={form.barcode} onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} style={IS} placeholder="Ex: 7891149107302" /></FF>
              <FF label="NCM"><input value={form.ncm} onChange={e => setForm(p => ({ ...p, ncm: e.target.value }))} style={IS} placeholder="Ex: 22030000" /></FF>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <FF label="Unidade"><select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} style={SS}>
                {['UN', 'KG', 'LT', 'CX', 'DZ', 'PCT', 'ML'].map(u => <option key={u} value={u}>{u}</option>)}
              </select></FF>
              <FF label="Categoria"><input value={form.categoryName} onChange={e => setForm(p => ({ ...p, categoryName: e.target.value }))} style={IS} placeholder="Ex: Cervejas" /></FF>
            </div>
            <FF label="Preço de Custo *"><input type="number" step="0.01" min="0" value={form.priceCost} onChange={e => setForm(p => ({ ...p, priceCost: e.target.value }))} style={IS} placeholder="Ex: 4.50" /></FF>
          </div>

          <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 700, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Store size={16} color="#10b981" /> Preço por Loja</h3>
            <div style={{ fontSize: '0.78rem', color: '#71717a', marginBottom: '1rem' }}>Selecione as lojas e defina o preço de venda de cada uma.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
              {tids.map(tid => (
                <div key={tid} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: selectedTenants[tid] ? 'rgba(167,139,250,0.08)' : 'rgba(39,39,42,0.3)', border: `1px solid ${selectedTenants[tid] ? 'rgba(167,139,250,0.25)' : 'rgba(63,63,70,0.4)'}`, borderRadius: '0.75rem', padding: '0.875rem 1rem', transition: 'all 0.15s' }}>
                  <input type="checkbox" checked={!!selectedTenants[tid]} onChange={() => setSelectedTenants(prev => ({ ...prev, [tid]: !prev[tid] }))} style={{ width: '16px', height: '16px', accentColor: '#a78bfa', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontWeight: 600, fontSize: '0.85rem', color: selectedTenants[tid] ? '#f4f4f5' : '#71717a' }}>{catalog.tenantLabels[tid]}</div>
                  {selectedTenants[tid] && (
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#52525b', fontSize: '0.75rem', fontWeight: 700 }}>R$</span>
                      <input type="number" step="0.01" min="0" placeholder="0,00" value={tenantPrices[tid] || ''} onChange={e => setTenantPrices(prev => ({ ...prev, [tid]: e.target.value }))} style={{ width: '100px', padding: '0.4rem 0.5rem 0.4rem 2rem', background: '#18181b', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '0.5rem', color: '#f4f4f5', fontSize: '0.85rem', outline: 'none' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {createMsg && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: createMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${createMsg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '0.625rem', fontSize: '0.82rem', color: createMsg.startsWith('✅') ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                {createMsg}
              </div>
            )}

            <Btn onClick={handleCreate} color="#a78bfa" disabled={creating}>
              {creating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
              {creating ? 'Criando...' : 'Criar Produto nas Lojas Selecionadas'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Transferências ────────────────────────────────────────────────────────

function TabTransferencias() {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fromTenantId: '', toTenantId: '', productId: '', quantity: '' });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/groups/my/stock', { headers: authHeaders() })
      .then(r => r.json()).then(setStockData).finally(() => setLoading(false));
  }, []);

  const tids = stockData ? Object.keys(stockData.tenantLabels) : [];

  const availableProducts = form.fromTenantId && stockData
    ? stockData.rows.filter(r => r.tenants[form.fromTenantId]?.qty > 0)
    : [];

  const handleTransfer = async () => {
    if (!form.fromTenantId || !form.toTenantId || !form.productId || !form.quantity) { setMsg('Preencha todos os campos.'); return; }
    if (form.fromTenantId === form.toTenantId) { setMsg('Origem e destino devem ser diferentes.'); return; }
    setSending(true); setMsg('');
    try {
      await fetch('/api/groups/my/stock-transfer', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ fromTenantId: form.fromTenantId, toTenantId: form.toTenantId, productId: form.productId, quantity: parseFloat(form.quantity) }) });
      setMsg('✅ Transferência realizada com sucesso!');
      setForm(p => ({ ...p, productId: '', quantity: '' }));
    } catch (e: any) { setMsg('❌ Erro ao transferir.'); }
    finally { setSending(false); }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#52525b' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease', maxWidth: '600px' }}>
      <div>
        <h2 style={{ margin: '0 0 0.375rem', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeftRight size={20} color="#f59e0b" /> Transferência de Estoque
        </h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#71717a' }}>Transfira produtos entre as lojas do grupo instantaneamente.</p>
      </div>
      <div style={{ background: 'rgba(20,20,22,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: '1rem', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <FF label="Loja Origem">
          <select value={form.fromTenantId} onChange={e => setForm(p => ({ ...p, fromTenantId: e.target.value, productId: '' }))} style={SS}>
            <option value="">Selecione a loja de origem...</option>
            {tids.map(tid => <option key={tid} value={tid}>{stockData!.tenantLabels[tid]}</option>)}
          </select>
        </FF>
        <FF label="Loja Destino">
          <select value={form.toTenantId} onChange={e => setForm(p => ({ ...p, toTenantId: e.target.value }))} style={SS}>
            <option value="">Selecione a loja de destino...</option>
            {tids.filter(t => t !== form.fromTenantId).map(tid => <option key={tid} value={tid}>{stockData!.tenantLabels[tid]}</option>)}
          </select>
        </FF>
        <FF label="Produto">
          <select value={form.productId} onChange={e => setForm(p => ({ ...p, productId: e.target.value }))} style={SS} disabled={!form.fromTenantId}>
            <option value="">Selecione o produto...</option>
            {availableProducts.map(r => <option key={r.tenants[form.fromTenantId].productId} value={r.tenants[form.fromTenantId].productId}>{r.name} (disponível: {r.tenants[form.fromTenantId].qty})</option>)}
          </select>
        </FF>
        <FF label="Quantidade">
          <input type="number" step="0.001" min="0.001" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} style={IS} placeholder="Ex: 10" />
        </FF>
        {msg && <div style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem', background: msg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '0.625rem', fontSize: '0.82rem', color: msg.startsWith('✅') ? '#4ade80' : '#f87171', fontWeight: 600 }}>{msg}</div>}
        <Btn onClick={handleTransfer} color="#f59e0b" disabled={sending}>
          {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowLeftRight size={14} />}
          {sending ? 'Transferindo...' : 'Confirmar Transferência'}
        </Btn>
      </div>
    </div>
  );
}

// ─── Sidebar Tabs ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2, color: '#3b82f6' },
  { id: 'forecast', label: 'Previsão de Compras', icon: TrendingUp, color: '#f43f5e' },
  { id: 'estoque', label: 'Estoque', icon: Package, color: '#10b981' },
  { id: 'produtos', label: 'Produtos', icon: Tag, color: '#a78bfa' },
  { id: 'transferencias', label: 'Transferências', icon: ArrowLeftRight, color: '#f59e0b' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GroupPortalPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [tabKey, setTabKey] = useState(0);
  const [dateFilter, setDateFilter] = useState('30d');

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
        @keyframes slideFromRight { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
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
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{user.name?.[0]?.toUpperCase() ?? '?'}</div>
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
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f4f4f5' }}>{activeTabDef.label}</div>
              <div style={{ fontSize: '0.62rem', color: '#52525b' }}>{user.tenant ?? 'Portal Grupo'}</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(39,39,42,0.6)', padding: '0.3rem 0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(63,63,70,0.6)' }}>
                <Calendar size={14} style={{ color: '#a1a1aa' }} />
                <select value={dateFilter} onChange={e => { setDateFilter(e.target.value); setTabKey(k => k + 1); }} style={{ background: 'transparent', border: 'none', color: '#f4f4f5', outline: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                  <option value="hoje">Apenas Hoje</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                </select>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.68rem', color: '#52525b' }}>Online</span>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '1.75rem 2rem', width: '100%', margin: '0 auto', paddingBottom: '3rem' }}>
          <div key={tabKey}>
            {activeTab === 'dashboard' && <TabDashboard dateFilter={dateFilter} />}
            {activeTab === 'forecast' && <TabForecast />}
            {activeTab === 'estoque' && <TabEstoque />}
            {activeTab === 'produtos' && <TabProdutos />}
            {activeTab === 'transferencias' && <TabTransferencias />}
          </div>
        </main>
      </div>
    </div>
  );
}
