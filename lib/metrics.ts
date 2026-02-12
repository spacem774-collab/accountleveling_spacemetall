import { BUCKETS, getLeague, type League } from "@/config/league";
import { PAID_DEAL_STATUSES } from "@/config/sheets";

/** Счёт выставлен = заполнен Номер счета */
export function hasInvoiceIssued(row: InvoiceRow): boolean {
  return String(row.invoice_id ?? "").trim() !== "";
}

/** Сделка оплачена = статус "Успешно реализовано" или "PAID" */
export function isPaidDeal(row: InvoiceRow): boolean {
  const s = String(row.status ?? "").trim();
  return PAID_DEAL_STATUSES.some((stat) => stat === s);
}

export interface CompanyRow {
  user_id: string;
  company_id: string;
  company_name: string;
  contact_name: string;
  created_at: string;
}

export interface InvoiceRow {
  user_id: string;
  /** Номер счета — если заполнен, счет выставлен */
  invoice_id: string;
  /** Сумма продажи (Сумма продажи) — для диапазона и суммы оплат */
  invoice_amount: number;
  invoice_date: string;
  /** Статус сделки — "Успешно реализовано" = оплачено */
  status: string;
  paid_date?: string;
  /** Маржа в % — рассчитывается или из полей */
  margin?: number;
  /** Бюджет — для суммы продаж */
  budget?: number;
  /** Сумма закупки — для расчёта маржи */
  purchase_amount?: number;
}

export interface Totals {
  issued_total: number;
  paid_total: number;
  conversion_total: number;
  cancelled_count: number;
  paid_sum_total: number;
  /** Итог по сумме продаж (бюджет) */
  budget_total?: number;
}

export interface BucketMetrics {
  bucket_id: string;
  label: string;
  issued_count_bucket: number;
  paid_count_bucket: number;
  conversion_bucket: number;
  paid_sum_bucket: number;
  /** Средняя маржа в диапазоне (%) */
  avg_margin_bucket?: number;
  /** Сумма по бюджету в диапазоне */
  budget_sum_bucket?: number;
}

export interface MetricsResult {
  user_id: string;
  companies_count: number;
  league: League;
  totals: Totals;
  buckets: BucketMetrics[];
  cancelled: { count: number };
  updated_at: string;
}

export function getCompaniesCount(
  companies: CompanyRow[],
  userId: string
): number {
  const withContact = companies.filter(
    (c) => c.user_id === userId && c.contact_name.trim() !== ""
  );
  const uniqueIds = new Set(withContact.map((c) => c.company_id));
  return uniqueIds.size;
}

/** Средняя маржа в %: (Сумма продажи − Сумма закупки) / Сумма продажи × 100 */
function calcMargin(row: InvoiceRow): number | undefined {
  const sales = row.invoice_amount; // Сумма продажи
  const purchase = row.purchase_amount; // Сумма закупки
  if (sales == null || sales <= 0 || purchase == null || Number.isNaN(purchase)) return undefined;
  return ((sales - purchase) / sales) * 100;
}

export function computeTotals(
  invoices: InvoiceRow[],
  userId: string
): Totals & { paid_sum_total: number } {
  const userInvoices = invoices.filter((i) => i.user_id === userId);
  const issued = userInvoices.filter(hasInvoiceIssued);
  const paid = userInvoices.filter(isPaidDeal);

  const issued_total = issued.length;
  const paid_total = paid.length;
  const paid_sum_total = paid.reduce((sum, i) => sum + i.invoice_amount, 0);
  const budget_total = paid.reduce((sum, i) => sum + (i.budget ?? i.invoice_amount), 0);

  let conversion_total = 0;
  if (issued_total > 0) {
    conversion_total = paid_total / issued_total;
  }

  const cancelled = userInvoices.filter(
    (i) => hasInvoiceIssued(i) && !isPaidDeal(i) && String(i.status ?? "").trim() !== ""
  );

  return {
    issued_total,
    paid_total,
    conversion_total,
    cancelled_count: cancelled.length,
    paid_sum_total,
    budget_total,
  };
}

export function aggregateByBuckets(
  invoices: InvoiceRow[],
  userId: string
): BucketMetrics[] {
  const userInvoices = invoices.filter((i) => i.user_id === userId);

  return BUCKETS.map((bucket) => {
    const inBucket = userInvoices.filter(
      (i) =>
        i.invoice_amount >= bucket.min &&
        i.invoice_amount <= bucket.max
    );
    const issuedInBucket = inBucket.filter(hasInvoiceIssued);
    const paidInBucket = inBucket.filter(isPaidDeal);

    const issued_count_bucket = issuedInBucket.length;
    const paid_count_bucket = paidInBucket.length;
    const conversion_bucket =
      issued_count_bucket > 0 ? paid_count_bucket / issued_count_bucket : 0;
    const paid_sum_bucket = paidInBucket.reduce(
      (sum, i) => sum + i.invoice_amount,
      0
    );
    const budget_sum_bucket = paidInBucket.reduce(
      (sum, i) => sum + (i.budget ?? i.invoice_amount),
      0
    );

    const margins = paidInBucket.map((i) => calcMargin(i)).filter((m): m is number => m != null && !Number.isNaN(m));
    const avg_margin_bucket =
      margins.length > 0 ? margins.reduce((s, m) => s + m, 0) / margins.length : undefined;

    return {
      bucket_id: bucket.id,
      label: bucket.label,
      issued_count_bucket,
      paid_count_bucket,
      conversion_bucket,
      paid_sum_bucket,
      avg_margin_bucket,
      budget_sum_bucket,
    };
  });
}

export function computeMetrics(
  companies: CompanyRow[],
  invoices: InvoiceRow[],
  userId: string
): MetricsResult {
  const companies_count = getCompaniesCount(companies, userId);
  const league = getLeague(companies_count);
  const totals = computeTotals(invoices, userId);
  const buckets = aggregateByBuckets(invoices, userId);

  return {
    user_id: userId,
    companies_count,
    league,
    totals,
    buckets,
    cancelled: { count: totals.cancelled_count },
    updated_at: new Date().toISOString(),
  };
}
