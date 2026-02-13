import { BUCKETS, getLeague, type League } from "@/config/league";
import { PAID_DEAL_STATUSES } from "@/config/sheets";

/** Счёт выставлен = заполнен Номер счета */
export function hasInvoiceIssued(row: InvoiceRow): boolean {
  return String(row.invoice_id ?? "").trim() !== "";
}

/** Нормализация строки статуса (убирает лишние пробелы) */
function normalizeStatus(s: string): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

/** Сделка закрыта = статус «Успешно реализовано» (из столбца «Имя статуса»). Только эти сделки входят в продажи и ачивки. */
export function isPaidDeal(row: InvoiceRow): boolean {
  const s = normalizeStatus(row.status ?? "");
  return PAID_DEAL_STATUSES.some((stat) => normalizeStatus(stat) === s);
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
  /** ID/название компании — для расчёта повторных продаж */
  company_id?: string;
  company_name?: string;
}

export interface Totals {
  issued_total: number;
  paid_total: number;
  conversion_total: number;
  cancelled_count: number;
  paid_sum_total: number;
  /** Итог по сумме продаж (бюджет) */
  budget_total?: number;
  /** Общая маржа в рублях: сумма (продажа − закупка) по оплаченным счетам */
  total_margin?: number;
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
  /** Максимальная сумма по бюджету (маржа) в одном календарном месяце за всё время */
  max_monthly_budget?: number;
  /** Максимальное количество продаж в одном календарном месяце за всё время */
  max_monthly_paid_count?: number;
  /** Сумма по бюджету в текущем месяце */
  current_month_budget?: number;
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

/** Сравнение user_id с учётом пробелов и разных форматов ФИО */
function userIdMatches(userId: string, invoiceUserId: string): boolean {
  const a = String(userId ?? "").trim();
  const b = String(invoiceUserId ?? "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  // Один содержит другой: "Ружников Дмитрий" / "Ружников Дмитрий Константинович"
  if (a.length >= 10 && b.length >= 10) {
    if (a.startsWith(b) || b.startsWith(a)) return true;
  }
  return false;
}

/** Маржа в рублях: Сумма продажи − Сумма закупки */
function calcMarginRub(row: InvoiceRow): number {
  const sales = row.invoice_amount;
  const purchase = row.purchase_amount;
  if (sales == null || sales <= 0 || purchase == null || Number.isNaN(purchase)) return 0;
  return Math.max(0, sales - purchase);
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
  const userInvoices = invoices.filter((i) => userIdMatches(userId, i.user_id));
  const issued = userInvoices.filter(hasInvoiceIssued);
  const paid = userInvoices.filter(isPaidDeal);

  const issued_total = issued.length;
  const paid_total = paid.length;
  const paid_sum_total = paid.reduce((sum, i) => sum + i.invoice_amount, 0);
  const budget_total = paid.reduce((sum, i) => sum + (i.budget ?? i.invoice_amount), 0);
  const total_margin = paid.reduce((sum, i) => sum + calcMarginRub(i), 0);

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
    total_margin,
  };
}

export function aggregateByBuckets(
  invoices: InvoiceRow[],
  userId: string
): BucketMetrics[] {
  const userInvoices = invoices.filter((i) => userIdMatches(userId, i.user_id));

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

/** Excel serial (дни с 1900-01-01) → JS Date */
function excelSerialToDate(serial: number): Date | null {
  const epoch = new Date(1899, 11, 30);
  const ms = serial * 24 * 60 * 60 * 1000;
  const d = new Date(epoch.getTime() + ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Извлекает год и месяц из даты. Возвращает "YYYY-MM" или null.
 * Поддерживает: DD.MM.YYYY, YYYY-MM-DD, дата+время, Excel serial, ISO. */
function getYearMonth(dateStr: string | undefined): string | null {
  if (!dateStr || !String(dateStr).trim()) return null;
  let s = String(dateStr).trim();
  // Убираем время: "13.01.2025 14:30" → "13.01.2025", "2025-01-13T14:30" → "2025-01-13"
  s = s.split(/[\sT]/)[0] ?? s;
  // DD.MM.YYYY или DD/MM/YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (ddmmyyyy) {
    const [, , month, year] = ddmmyyyy;
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  // YYYY-MM-DD или ISO
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const [, year, month] = iso;
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  // Excel serial (число в ячейке Google Sheets)
  const excelSerial = parseFloat(s);
  if (!Number.isNaN(excelSerial) && excelSerial > 0) {
    const d = excelSerialToDate(excelSerial);
    if (d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  } catch {
    return null;
  }
}

/** Минимальный год для учёта сделок в ачивках (включительно) */
const ACHIEVEMENTS_MIN_YEAR = 2024;

/** Месячная статистика: закрытые сделки за период 1 месяца.
 * — Статус: только «Успешно реализовано» (столбец «Имя статуса»).
 * — Месяц: по столбцу «Дата завершения» (paid_date).
 * — Учитываются только сделки с 2024 года.
 * — Каскад: 10 сделок в месяце → выдают ачивки 5 и 10. */
export function computeMonthlyStats(
  invoices: InvoiceRow[],
  userId: string
): {
  monthly_paid_count: number;
  monthly_margin: number;
  current_month_paid: number;
  current_month_margin: number;
  current_month_budget: number;
  /** Количество закрытых сделок по месяцам (YYYY-MM) */
  byMonth: Record<string, number>;
} {
  const userPaid = invoices.filter((i) => userIdMatches(userId, i.user_id) && isPaidDeal(i));
  const byMonth = new Map<string, { count: number; margin: number; budget: number }>();

  for (const inv of userPaid) {
    const dateStr = String(inv.paid_date ?? inv.invoice_date ?? "").trim();
    const key = getYearMonth(dateStr || undefined);
    if (!key || key < `${ACHIEVEMENTS_MIN_YEAR}-01`) continue;
    const cur = byMonth.get(key) ?? { count: 0, margin: 0, budget: 0 };
    cur.count += 1;
    cur.margin += calcMarginRub(inv);
    cur.budget += inv.budget ?? inv.invoice_amount ?? 0;
    byMonth.set(key, cur);
  }

  let maxCount = 0;
  let maxMargin = 0;
  const byMonthRecord: Record<string, number> = {};
  for (const [k, { count, margin }] of byMonth) {
    byMonthRecord[k] = count;
    if (count > maxCount) maxCount = count;
    if (margin > maxMargin) maxMargin = margin;
  }

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const current = byMonth.get(currentKey) ?? { count: 0, margin: 0, budget: 0 };

  return {
    monthly_paid_count: maxCount,
    monthly_margin: maxMargin,
    current_month_paid: current.count,
    current_month_margin: current.margin,
    current_month_budget: current.budget,
    byMonth: byMonthRecord,
  };
}

/** Общий бюджет (сумма продаж) фактически закрытых сделок в текущем месяце по всем сотрудникам. */
export function computeTotalCurrentMonthBudget(
  invoices: InvoiceRow[],
  excludedUserIds: string[] = []
): number {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let total = 0;
  for (const inv of invoices) {
    if (!isPaidDeal(inv)) continue;
    const uid = String(inv.user_id ?? "").trim();
    const isExcluded = excludedUserIds.some(
      (ex) => ex && (uid.includes(ex.trim()) || ex.trim().includes(uid))
    );
    if (isExcluded) continue;
    const dateStr = String(inv.paid_date ?? inv.invoice_date ?? "").trim();
    const key = getYearMonth(dateStr || undefined);
    if (key !== currentKey) continue;
    total += inv.budget ?? inv.invoice_amount ?? 0;
  }
  return total;
}

/** Общая маржа фактически закрытых сделок в текущем месяце по всем сотрудникам (исключая excludedUserIds). */
export function computeTotalCurrentMonthMargin(
  invoices: InvoiceRow[],
  excludedUserIds: string[] = []
): number {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let total = 0;
  for (const inv of invoices) {
    if (!isPaidDeal(inv)) continue;
    const uid = String(inv.user_id ?? "").trim();
    const isExcluded = excludedUserIds.some(
      (ex) => ex && (uid.includes(ex.trim()) || ex.trim().includes(uid))
    );
    if (isExcluded) continue;
    const dateStr = String(inv.paid_date ?? inv.invoice_date ?? "").trim();
    const key = getYearMonth(dateStr || undefined);
    if (key !== currentKey) continue;
    total += calcMarginRub(inv);
  }
  return total;
}

/** Общая маржа фактически закрытых сделок в предыдущем месяце по всем сотрудникам. */
export function computeTotalPreviousMonthMargin(
  invoices: InvoiceRow[],
  excludedUserIds: string[] = []
): number {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevKey = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}`;
  let total = 0;
  for (const inv of invoices) {
    if (!isPaidDeal(inv)) continue;
    const uid = String(inv.user_id ?? "").trim();
    const isExcluded = excludedUserIds.some(
      (ex) => ex && (uid.includes(ex.trim()) || ex.trim().includes(uid))
    );
    if (isExcluded) continue;
    const dateStr = String(inv.paid_date ?? inv.invoice_date ?? "").trim();
    const key = getYearMonth(dateStr || undefined);
    if (key !== prevKey) continue;
    total += calcMarginRub(inv);
  }
  return total;
}

/** Лучший сотрудник за конкретный месяц по марже. Возвращает { user_id, margin } или null. */
function getBestEmployeeForMonth(
  invoices: InvoiceRow[],
  monthKey: string,
  userIds: string[],
  excludedUserIds: string[] = []
): { user_id: string; margin: number } | null {
  const byUser = new Map<string, number>();

  for (const inv of invoices) {
    if (!isPaidDeal(inv)) continue;
    const uid = String(inv.user_id ?? "").trim();
    const isExcluded = excludedUserIds.some(
      (ex) => ex && (uid.includes(ex.trim()) || ex.trim().includes(uid))
    );
    if (isExcluded) continue;
    const matchedId = userIds.find((id) => userIdMatches(id, uid));
    if (!matchedId) continue;
    const dateStr = String(inv.paid_date ?? inv.invoice_date ?? "").trim();
    const key = getYearMonth(dateStr || undefined);
    if (key !== monthKey) continue;
    byUser.set(matchedId, (byUser.get(matchedId) ?? 0) + calcMarginRub(inv));
  }

  let best: { user_id: string; margin: number } | null = null;
  for (const [id, margin] of byUser) {
    if (margin > 0 && (!best || margin > best.margin)) {
      best = { user_id: id, margin };
    }
  }
  return best;
}

/** Лучший сотрудник по марже в текущем году (YTD). */
export function getBestEmployeeByCurrentYearMargin(
  invoices: InvoiceRow[],
  userIds: string[],
  excludedUserIds: string[] = []
): { user_id: string; margin: number } | null {
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const byUser = new Map<string, number>();

  for (const inv of invoices) {
    if (!isPaidDeal(inv)) continue;
    const uid = String(inv.user_id ?? "").trim();
    const isExcluded = excludedUserIds.some(
      (ex) => ex && (uid.includes(ex.trim()) || ex.trim().includes(uid))
    );
    if (isExcluded) continue;
    const matchedId = userIds.find((id) => userIdMatches(id, uid));
    if (!matchedId) continue;
    const dateStr = String(inv.paid_date ?? inv.invoice_date ?? "").trim();
    const key = getYearMonth(dateStr || undefined);
    if (!key || !key.startsWith(currentYear)) continue;
    byUser.set(matchedId, (byUser.get(matchedId) ?? 0) + calcMarginRub(inv));
  }

  let best: { user_id: string; margin: number } | null = null;
  for (const [id, margin] of byUser) {
    if (margin > 0 && (!best || margin > best.margin)) {
      best = { user_id: id, margin };
    }
  }
  return best;
}

/** Лучший сотрудник прошлого месяца + количество месяцев подряд на пьедестале. */
export function getBestEmployeeByPreviousMonthMargin(
  invoices: InvoiceRow[],
  userIds: string[],
  excludedUserIds: string[] = []
): { user_id: string; margin: number; consecutive_months: number } | null {
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 1; i <= 24; i++) {
    let m = now.getMonth() - i;
    let y = now.getFullYear();
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    if (key < `${ACHIEVEMENTS_MIN_YEAR}-01`) break;
    monthKeys.push(key);
  }

  const first = getBestEmployeeForMonth(invoices, monthKeys[0], userIds, excludedUserIds);
  if (!first) return null;

  let consecutive = 1;
  for (let i = 1; i < monthKeys.length; i++) {
    const next = getBestEmployeeForMonth(invoices, monthKeys[i], userIds, excludedUserIds);
    if (!next || !userIdMatches(first.user_id, next.user_id)) break;
    consecutive += 1;
  }

  return {
    user_id: first.user_id,
    margin: first.margin,
    consecutive_months: consecutive,
  };
}

/** Количество закрытых сделок за конкретный месяц (по «Дата завершения»). */
export function getClosedCountForMonth(
  invoices: InvoiceRow[],
  userId: string,
  monthKey: string
): number {
  const stats = computeMonthlyStats(invoices, userId);
  return stats.byMonth[monthKey] ?? 0;
}

/** Максимальная сумма по бюджету (маржа) в одном календарном месяце. Сканирует все месяцы, возвращает рекорд. */
export function computeMaxMonthlyBudget(
  invoices: InvoiceRow[],
  userId: string
): number {
  const userPaid = invoices.filter((i) => userIdMatches(userId, i.user_id) && isPaidDeal(i));
  const byMonth = new Map<string, number>();

  for (const inv of userPaid) {
    const dateStr = String(inv.paid_date ?? inv.invoice_date ?? "").trim();
    const key = getYearMonth(dateStr || undefined);
    if (!key || key < `${ACHIEVEMENTS_MIN_YEAR}-01`) continue;
    const budget = inv.budget ?? inv.invoice_amount ?? 0;
    byMonth.set(key, (byMonth.get(key) ?? 0) + budget);
  }

  let max = 0;
  for (const sum of byMonth.values()) {
    if (sum > max) max = sum;
  }
  return max;
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
  const max_monthly_budget = computeMaxMonthlyBudget(invoices, userId);
  const monthlyStats = computeMonthlyStats(invoices, userId);
  const max_monthly_paid_count = monthlyStats.monthly_paid_count;
  const current_month_budget = monthlyStats.current_month_budget;

  return {
    user_id: userId,
    companies_count,
    league,
    totals,
    buckets,
    cancelled: { count: totals.cancelled_count },
    max_monthly_budget: max_monthly_budget > 0 ? max_monthly_budget : undefined,
    max_monthly_paid_count: max_monthly_paid_count > 0 ? max_monthly_paid_count : undefined,
    current_month_budget,
    updated_at: new Date().toISOString(),
  };
}
