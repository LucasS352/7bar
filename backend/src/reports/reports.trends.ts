import { Prisma } from '@prisma/client';
import { reportPeriod } from './reports.period';
import type { DailySalesPoint, PeriodComparison } from './reports.types';

const DAY = 86_400_000;
type Period = ReturnType<typeof reportPeriod>;

export interface DailySalesRow {
  date: string;
  revenue: Prisma.Decimal | string | number;
  transactions: bigint | number;
  totalCost?: Prisma.Decimal | string | number;
}

export interface SalesTrendsTotals {
  revenue: Prisma.Decimal;
  totalCost?: Prisma.Decimal;
}

const businessDate = (time: number) => new Date(time - 3 * 3_600_000).toISOString().slice(0, 10);

const toDecimal = (value: Prisma.Decimal | string | number | undefined | null): Prisma.Decimal =>
  value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value?.toString() ?? '0');

export function computeMarginPercent(grossProfit: Prisma.Decimal, revenue: Prisma.Decimal): string | null {
  if (!revenue.gt(0)) return null;
  return grossProfit.div(revenue).mul(100).toFixed(2);
}

export function previousReportPeriod(period: Period) {
  return reportPeriod(
    businessDate(period.start.getTime() - period.days * DAY),
    businessDate(period.start.getTime() - DAY),
  );
}

export function salesTrends(
  period: Period,
  rows: DailySalesRow[],
  totalsOrRevenue: Prisma.Decimal | SalesTrendsTotals,
  now: Date,
): { daily: DailySalesPoint[]; comparison: PeriodComparison } {
  const totals: SalesTrendsTotals =
    totalsOrRevenue instanceof Prisma.Decimal
      ? { revenue: totalsOrRevenue, totalCost: new Prisma.Decimal(0) }
      : totalsOrRevenue;

  const revenue = toDecimal(totals.revenue);
  const currentTotalCost = toDecimal(totals.totalCost);
  const currentGrossProfit = revenue.minus(currentTotalCost);

  const previous = previousReportPeriod(period);
  const byDate = new Map(rows.map((row) => [row.date, row]));

  const daily: DailySalesPoint[] = Array.from({ length: period.days }, (_, index) => {
    const date = businessDate(period.start.getTime() + index * DAY);
    const row = byDate.get(date);
    const dayRevenue = toDecimal(row?.revenue);
    const dayCost = toDecimal(row?.totalCost);
    const dayProfit = dayRevenue.minus(dayCost);
    return {
      date,
      revenue: dayRevenue.toFixed(2),
      totalCost: dayCost.toFixed(2),
      grossProfit: dayProfit.toFixed(2),
      marginPercent: computeMarginPercent(dayProfit, dayRevenue),
      transactions: Number(row?.transactions ?? 0),
    };
  });

  let previousRevenue = new Prisma.Decimal(0);
  let previousCost = new Prisma.Decimal(0);
  let previousTransactions = 0;

  for (const row of rows) {
    if (row.date >= previous.startDate && row.date <= previous.endDate) {
      previousRevenue = previousRevenue.plus(toDecimal(row.revenue));
      previousCost = previousCost.plus(toDecimal(row.totalCost));
      previousTransactions += Number(row.transactions);
    }
  }

  const previousGrossProfit = previousRevenue.minus(previousCost);
  const revenueDifference = revenue.minus(previousRevenue);
  const grossProfitDifference = currentGrossProfit.minus(previousGrossProfit);

  return {
    daily,
    comparison: {
      startDate: previous.startDate,
      endDate: previous.endDate,
      days: previous.days,
      revenue: previousRevenue.toFixed(2),
      totalCost: previousCost.toFixed(2),
      grossProfit: previousGrossProfit.toFixed(2),
      marginPercent: computeMarginPercent(previousGrossProfit, previousRevenue),
      transactions: previousTransactions,
      averageTicket: previousTransactions ? previousRevenue.div(previousTransactions).toFixed(2) : '0.00',
      revenueDifference: revenueDifference.toFixed(2),
      revenueChangePercent: previousRevenue.gt(0)
        ? revenueDifference.div(previousRevenue).mul(100).toFixed(2)
        : null,
      grossProfitDifference: grossProfitDifference.toFixed(2),
      grossProfitChangePercent: previousGrossProfit.gt(0)
        ? grossProfitDifference.div(previousGrossProfit).mul(100).toFixed(2)
        : null,
      includesOpenDays: previous.endExclusive > now,
    },
  };
}
