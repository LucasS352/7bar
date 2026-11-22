import { useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Edit,
  X,
} from 'lucide-react';

type Tenant = any;
type ListMode = 'month' | 'overdue' | 'nodate';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateKey(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return toDayKey(date);
}

function formatCurrency(value: unknown) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getTenantName(tenant: Tenant) {
  return tenant.name || tenant.nomeFantasia || 'Sem nome';
}

interface DueMeta {
  statusLabel: string;
  rowTone: string;
  badgeTone: string;
  dotTone: string;
  cellTone: string;
  priority: number;
}

function getTenantDueMeta(tenant: Tenant, todayDay: Date): DueMeta {
  if (!tenant.mensalidadeVencimento) {
    return {
      statusLabel: 'Definir data de cobrança',
      rowTone: 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700',
      badgeTone: 'bg-zinc-800 text-zinc-400',
      dotTone: 'bg-zinc-500',
      cellTone: 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/60 hover:bg-zinc-800',
      priority: 0,
    };
  }

  const due = new Date(tenant.mensalidadeVencimento);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - todayDay.getTime()) / 86_400_000);

  if (tenant.status !== 'active') {
    const statusMap: Record<string, string> = {
      paused: 'Pausado',
      suspended: 'Suspenso',
    };
    return {
      statusLabel: statusMap[tenant.status] || 'Inativo',
      rowTone: 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700',
      badgeTone: 'bg-zinc-800 text-zinc-400',
      dotTone: 'bg-zinc-500',
      cellTone: 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/60 hover:bg-zinc-800',
      priority: 1,
    };
  }

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return {
      statusLabel: days === 1 ? 'Atrasado há 1 dia' : `Atrasado há ${days} dias`,
      rowTone: 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50',
      badgeTone: 'bg-rose-500/15 text-rose-300',
      dotTone: 'bg-rose-400',
      cellTone: 'bg-rose-500/15 text-rose-200 border border-rose-500/30 hover:bg-rose-500/25',
      priority: 4,
    };
  }

  if (diffDays === 0) {
    return {
      statusLabel: 'Vence hoje',
      rowTone: 'border-amber-500/35 bg-amber-500/5 hover:border-amber-500/55',
      badgeTone: 'bg-amber-500/15 text-amber-300',
      dotTone: 'bg-amber-400',
      cellTone: 'bg-amber-500/15 text-amber-100 border border-amber-500/35 hover:bg-amber-500/25',
      priority: 3,
    };
  }

  return {
    statusLabel:
      diffDays <= 5
        ? `Vence em ${diffDays} dia${diffDays > 1 ? 's' : ''}`
        : 'Em dia',
    rowTone: 'border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/45',
    badgeTone: 'bg-emerald-500/15 text-emerald-300',
    dotTone: 'bg-emerald-400',
    cellTone: 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/25 hover:bg-emerald-500/20',
    priority: 2,
  };
}

/**
 * Compact billing agenda combining an interactive mini month calendar
 * (day markers only) with a side-by-side list of monthly due dates.
 */
export function TenantBillingCalendar({
  tenants,
  month,
  onMonthChange,
  onEdit,
  onRegisterPayment,
  registeringPayment = false,
}: {
  tenants: Tenant[];
  month: Date;
  onMonthChange: (month: Date) => void;
  onEdit: (tenant: Tenant) => void;
  onRegisterPayment: (tenantId: string) => void;
  registeringPayment?: boolean;
}) {
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [listMode, setListMode] = useState<ListMode>('month');

  const current = startOfMonth(month);
  const now = new Date();
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstWeekday = current.getDay();
  const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
  const totalSlots = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalSlots }, (_, index) => index - firstWeekday + 1);

  const byDay = new Map<string, Tenant[]>();
  const monthItems: Tenant[] = [];
  const overdue: Tenant[] = [];
  const withoutDate: Tenant[] = [];

  for (const tenant of tenants) {
    const key = dateKey(tenant.mensalidadeVencimento);
    if (!key) {
      withoutDate.push(tenant);
      continue;
    }

    const due = new Date(tenant.mensalidadeVencimento);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    if (tenant.status === 'active' && dueDay < todayDay) {
      overdue.push(tenant);
    }

    if (due.getFullYear() === current.getFullYear() && due.getMonth() === current.getMonth()) {
      monthItems.push(tenant);
    }

    const items = byDay.get(key) || [];
    items.push(tenant);
    byDay.set(key, items);
  }

  const sortByDueAsc = (a: Tenant, b: Tenant) => {
    const da = new Date(a.mensalidadeVencimento).getTime();
    const db = new Date(b.mensalidadeVencimento).getTime();
    if (da !== db) return da - db;
    return getTenantName(a).localeCompare(getTenantName(b), 'pt-BR');
  };

  monthItems.sort(sortByDueAsc);
  overdue.sort(sortByDueAsc);
  withoutDate.sort((a, b) => getTenantName(a).localeCompare(getTenantName(b), 'pt-BR'));

  const monthRaw = current.toLocaleDateString('pt-BR', { month: 'long' });
  const monthName = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const monthYearLabel = `${monthName} ${current.getFullYear()}`;
  const isToday = (day: number) =>
    day === now.getDate() &&
    current.getMonth() === now.getMonth() &&
    current.getFullYear() === now.getFullYear();

  const changeMonth = (delta: number) => {
    setSelectedDayKey(null);
    onMonthChange(new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const goToday = () => {
    setSelectedDayKey(null);
    setListMode('month');
    onMonthChange(startOfMonth(new Date()));
  };

  const visibleItems = selectedDayKey
    ? (byDay.get(selectedDayKey) || []).slice().sort(sortByDueAsc)
    : listMode === 'overdue'
      ? overdue
      : listMode === 'nodate'
        ? withoutDate
        : monthItems;

  const visibleTotal = visibleItems.reduce((sum, t) => sum + (Number(t.mensalidadeValor) || 0), 0);

  const selectedDayShort = selectedDayKey
    ? `${selectedDayKey.slice(8, 10)}/${selectedDayKey.slice(5, 7)}`
    : null;

  const handleSelectDay = (key: string) => {
    setSelectedDayKey(prev => (prev === key ? null : key));
    setListMode('month');
  };

  const handleSwitchMode = (mode: ListMode) => {
    setSelectedDayKey(null);
    setListMode(mode);
  };

  return (
    <section
      aria-label="Agenda de vencimentos"
      className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[296px_1fr]">
        {/* Mini calendário marcando somente os dias */}
        <div className="flex flex-col">
          <header className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                <CalendarDays size={16} />
              </span>
              <h2 className="truncate text-sm font-bold text-zinc-100">{monthYearLabel}</h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Mês anterior"
                title="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="rounded-lg border border-zinc-700/80 px-2 py-1 text-[11px] font-bold text-zinc-200 transition hover:bg-zinc-800"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Próximo mês"
                title="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-zinc-500 pb-1.5">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              const active = day > 0 && day <= daysInMonth;
              if (!active) {
                return <div key={index} className="h-9 rounded-xl" aria-hidden="true" />;
              }

              const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const items = byDay.get(key) || [];
              const isSelected = selectedDayKey === key;
              const metas = items.map(t => getTenantDueMeta(t, todayDay));
              const highestMeta = metas.reduce<DueMeta | null>(
                (best, cur) => (!best || cur.priority > best.priority ? cur : best),
                null
              );

              const tooltip = items.length
                ? `${String(day).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}: ${items
                    .map(t => `${getTenantName(t)} (${formatCurrency(t.mensalidadeValor)})`)
                    .join(', ')}`
                : `${String(day).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}: sem vencimentos`;

              const cellClass = isSelected
                ? 'bg-violet-600 text-white border border-violet-400 shadow-sm shadow-violet-600/30'
                : highestMeta
                  ? `${highestMeta.cellTone}${isToday(day) ? ' ring-1 ring-violet-400/80' : ''}`
                  : isToday(day)
                    ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/70 hover:bg-violet-500/25'
                    : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100';

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectDay(key)}
                  aria-pressed={isSelected}
                  aria-label={tooltip}
                  title={tooltip}
                  className={`flex h-9 flex-col items-center justify-center rounded-xl text-xs font-semibold tabular-nums transition ${cellClass}`}
                >
                  <span className="leading-none">{day}</span>
                  <span className="mt-1 flex h-1.5 items-center gap-0.5">
                    {metas.slice(0, 3).map((meta, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : meta.dotTone}`}
                      />
                    ))}
                    {metas.length > 3 && (
                      <span className={`text-[9px] leading-none font-bold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>+</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-800/80 pt-2.5 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Atrasado</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Hoje</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Em dia</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-zinc-500" /> Inativo</span>
          </div>
        </div>

        {/* Lista compacta de vencimentos do mês */}
        <div className="flex min-w-0 flex-col border-t border-zinc-800/80 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">
                  {selectedDayShort
                    ? `Vencimentos de ${selectedDayShort}`
                    : listMode === 'overdue'
                      ? 'Mensalidades em atraso'
                      : listMode === 'nodate'
                        ? 'Sem vencimento definido'
                        : `Vencimentos de ${monthName}`}
                </h3>
                {selectedDayShort && (
                  <button
                    type="button"
                    onClick={() => setSelectedDayKey(null)}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-500/30"
                  >
                    Limpar dia <X size={11} />
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-zinc-400 tabular-nums">
                {visibleItems.length} cliente(s)
                {listMode !== 'nodate' ? ` · Total ${formatCurrency(visibleTotal)}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/70 p-1">
              <button
                type="button"
                onClick={() => handleSwitchMode('month')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  !selectedDayKey && listMode === 'month'
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Do mês ({monthItems.length})
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('overdue')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  !selectedDayKey && listMode === 'overdue'
                    ? 'bg-rose-600 text-white'
                    : overdue.length > 0
                      ? 'text-rose-300 hover:bg-rose-500/10'
                      : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Atrasados ({overdue.length})
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('nodate')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  !selectedDayKey && listMode === 'nodate'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sem data ({withoutDate.length})
              </button>
            </div>
          </header>

          <div className="mt-3 max-h-[268px] flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {visibleItems.map(tenant => {
              const meta = getTenantDueMeta(tenant, todayDay);
              const dueDate = tenant.mensalidadeVencimento ? new Date(tenant.mensalidadeVencimento) : null;
              const dayBadge = dueDate
                ? `${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}`
                : '--/--';

              return (
                <div
                  key={tenant.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition ${meta.rowTone}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      className={`w-12 shrink-0 rounded-lg py-1 text-center text-[11px] font-bold tabular-nums ${meta.badgeTone}`}
                    >
                      {dayBadge}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEdit(tenant)}
                      className="min-w-0 flex-1 text-left group"
                      title="Abrir cadastro do cliente"
                    >
                      <p className="truncate text-xs font-bold text-zinc-100 group-hover:text-violet-300">
                        {getTenantName(tenant)}
                      </p>
                      <p className="truncate text-[11px] text-zinc-400">{meta.statusLabel}</p>
                    </button>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="mr-1 text-xs font-bold tabular-nums text-zinc-100">
                      {formatCurrency(tenant.mensalidadeValor)}
                    </span>
                    {tenant.mensalidadeVencimento && (
                      <button
                        type="button"
                        onClick={() => onRegisterPayment(tenant.id)}
                        disabled={registeringPayment}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-40"
                        title="Registrar pagamento e avançar vencimento em 1 mês"
                      >
                        <DollarSign size={13} /> Receber
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(tenant)}
                      className="rounded-lg border border-zinc-700/80 p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                      title="Editar cliente"
                      aria-label={`Editar ${getTenantName(tenant)}`}
                    >
                      <Edit size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {!visibleItems.length && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-10 text-center">
                {listMode === 'overdue' ? (
                  <>
                    <Clock size={20} className="mb-2 text-emerald-400/70" />
                    <p className="text-xs text-zinc-400">Nenhuma mensalidade em atraso.</p>
                  </>
                ) : selectedDayShort ? (
                  <>
                    <CalendarDays size={20} className="mb-2 text-zinc-600" />
                    <p className="text-xs text-zinc-400">
                      Nenhum vencimento marcado para {selectedDayShort}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedDayKey(null)}
                      className="mt-2 text-xs font-semibold text-violet-400 hover:text-violet-300"
                    >
                      Ver todos de {monthName} →
                    </button>
                  </>
                ) : listMode === 'nodate' ? (
                  <p className="text-xs text-zinc-400">Todos os clientes possuem vencimento.</p>
                ) : (
                  <>
                    <CalendarDays size={20} className="mb-2 text-zinc-600" />
                    <p className="text-xs text-zinc-400">
                      Nenhum vencimento previsto para {monthYearLabel}.
                    </p>
                    {overdue.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('overdue')}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-300 hover:text-rose-200"
                      >
                        <AlertTriangle size={12} /> Ver {overdue.length} em atraso →
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
