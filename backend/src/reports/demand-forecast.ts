const DAY = 86_400_000;
export interface DemandRow {
  day: string;
  productId: string;
  name: string;
  unit: string;
  quantity: { toString(): string };
}

export function forecastWindow(now: Date) {
  const today = new Date(now.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
  const end = new Date(today + 'T03:00:00Z');
  return { today, end, start: new Date(+end - 90 * DAY) };
}

export function demandForecast(rows: DemandRow[], today: string) {
  const origin = Date.parse(today);
  const products = new Map<string, { name: string; unit: string; days: Map<number, number> }>();

  for (const row of rows) {
    const age = (origin - Date.parse(row.day)) / DAY;
    if (age < 1 || age > 90) continue;

    let product = products.get(row.productId);
    if (!product) {
      product = { name: row.name, unit: row.unit, days: new Map() };
      products.set(row.productId, product);
    }
    product.days.set(age, Number(row.quantity));
  }
  const firstWeekday = new Date(origin).getUTCDay();
  const weekday = (offset: number) => (((firstWeekday + offset) % 7) + 7) % 7;
  const saturday = (6 - weekday(0) + 7) % 7;
  const horizons = [
    { key: '7', offset: 0, length: 7 },
    { key: '14', offset: 0, length: 14 },
    { key: '30', offset: 0, length: 30 },
    { key: 'weekend', offset: saturday, length: 2 },
  ];
  const dateAt = (offset: number) => new Date(origin + offset * DAY).toISOString().slice(0, 10);
  const profiles: {
    id: string;
    name: string;
    unit: string;
    last7: number;
    last30: number;
    last90: number;
    daily: number;
    trend: string;
    weekdays: { mean: number; low: number; high: number }[];
    regular: boolean;
  }[] = [];
  const insufficientNames: string[] = [];
  let insufficient = 0;
  for (const [id, product] of products) {
    const ages = [...product.days.keys()];
    const span = Math.max(...ages);
    if (span < 21 || ages.length < 4) {
      insufficient++;
      if (insufficientNames.length < 10) insufficientNames.push(product.name);
      continue;
    }
    const sum = (days: number) => ages.reduce((s, a) => s + (a <= days ? product.days.get(a)! : 0), 0);
    const last7 = sum(7),
      last30 = sum(30),
      last90 = sum(90);
    const baseline = (last30 - last7) / (Math.min(30, span) - 7);
    const trend =
      last7 / 7 > baseline * 1.2 ? 'Em alta' : last7 / 7 < baseline * 0.8 ? 'Em queda' : 'Estável';
    const weekdays: { mean: number; low: number; high: number }[] = [];
    // Include zero-sale weekdays. Recency weights and a winsorized upper tail limit isolated spikes.
    for (let day = 0; day < 7; day++) {
      const sample: { qty: number; weight: number }[] = [];
      for (let age = 1; age <= span; age++) {
        if (weekday(-age) === day)
          sample.push({ qty: product.days.get(age) ?? 0, weight: age <= 7 ? 3 : age <= 30 ? 2 : 1 });
      }
      const sorted = sample.map((p) => p.qty).sort((a, b) => a - b);
      const quantile = (q: number) => sorted[Math.floor((sorted.length - 1) * q)];
      const cap = sorted.length >= 6 ? Math.max(quantile(0.9), quantile(0.5) * 2) : sorted[sorted.length - 1];
      const mean =
        sample.reduce((s, p) => s + Math.min(p.qty, cap || p.qty) * p.weight, 0) /
        sample.reduce((s, p) => s + p.weight, 0);
      weekdays.push({
        mean,
        low: Math.min(mean, quantile(0.2)),
        high: Math.max(mean, sorted[Math.ceil((sorted.length - 1) * 0.8)]),
      });
    }
    profiles.push({
      id,
      name: product.name,
      unit: product.unit,
      last7,
      last30,
      last90,
      daily: last90 / span,
      trend,
      weekdays,
      regular: span >= 42 && ages.length >= 12,
    });
  }
  const projections = horizons.map(({ key, offset, length }) => {
    const items = profiles.map(({ weekdays, regular, ...product }) => {
      let estimate = 0,
        low = 0,
        high = 0;
      for (let i = 0; i < length; i++) {
        const day = weekdays[weekday(offset + i)];
        estimate += day.mean;
        low += day.low;
        high += day.high;
      }
      let demandBeforeStart = 0;
      for (let i = 0; i < offset; i++) demandBeforeStart += weekdays[weekday(i)].mean;
      return {
        ...product,
        demandBeforeStart,
        estimate,
        low,
        high,
        confidence: regular && estimate > 0 && high - low <= estimate ? 'Moderada' : 'Baixa',
      };
    });
    items.sort((a, b) => b.estimate - a.estimate || b.last30 - a.last30 || a.id.localeCompare(b.id));
    return {
      key,
      start: dateAt(offset),
      end: dateAt(offset + length - 1),
      insufficient,
      items: items.slice(0, 10),
    };
  });
  return { start: dateAt(-90), end: dateAt(-1), insufficientNames, projections };
}
