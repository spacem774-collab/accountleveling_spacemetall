import { NextResponse } from "next/server";
import { fetchCompanies, fetchInvoices, fetchDebugConnectionsRaw, fetchDebugSalesFunnelRaw, clearInvoicesCache } from "@/lib/sheets";
import { computeMonthlyStats, computeTotals, isPaidDeal } from "@/lib/metrics";
import { PAID_DEAL_STATUSES } from "@/config/sheets";

/** Сравнение user_id (как в computeMonthlyStats) */
function userIdMatches(userId: string, invoiceUserId: string): boolean {
  const a = String(userId ?? "").trim();
  const b = String(invoiceUserId ?? "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 10 && b.length >= 10) {
    if (a.startsWith(b) || b.startsWith(a)) return true;
  }
  return false;
}

/** Маржа в рублях: продажа − закупка */
function calcMarginRub(inv: { invoice_amount: number; purchase_amount?: number }): number {
  const sales = inv.invoice_amount;
  const purchase = inv.purchase_amount;
  if (sales == null || sales <= 0 || purchase == null || Number.isNaN(purchase)) return 0;
  return Math.max(0, sales - purchase);
}

/** Год-месяц из даты */
function getYearMonth(dateStr: string | undefined): string | null {
  if (!dateStr || !String(dateStr).trim()) return null;
  const s = String(dateStr).trim();
  const ddmmyyyy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (ddmmyyyy) {
    const [, , month, year] = ddmmyyyy;
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } catch {
    return null;
  }
}

/** Отладка: ?raw=1 — связки, ?funnel=1 — воронка, ?audit=1&user_id=XXX — проверка ачивок и маржи */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("raw") === "1";
  const funnel = searchParams.get("funnel") === "1";
  const audit = searchParams.get("audit") === "1";
  const auditUserId = searchParams.get("user_id")?.trim();

  try {
    if (audit && auditUserId) {
      clearInvoicesCache();
      const invoices = await fetchInvoices();

      const userInvoices = invoices.filter((i) => userIdMatches(auditUserId, i.user_id));
      const paidDeals = userInvoices.filter((i) => isPaidDeal(i));

      const skippedNoPaidDate = paidDeals.filter((i) => !getYearMonth(i.paid_date));
      const countedDeals = paidDeals.filter((i) => getYearMonth(i.paid_date));

      const byMonth: Record<string, { count: number; margin: number; deals: Array<{ invoice_amount: number; purchase_amount?: number; margin: number; paid_date?: string; status: string }> }> = {};
      for (const inv of countedDeals) {
        const key = getYearMonth(inv.paid_date)!;
        if (!byMonth[key]) byMonth[key] = { count: 0, margin: 0, deals: [] };
        const margin = calcMarginRub(inv);
        byMonth[key].count += 1;
        byMonth[key].margin += margin;
        byMonth[key].deals.push({
          invoice_amount: inv.invoice_amount,
          purchase_amount: inv.purchase_amount,
          margin,
          paid_date: inv.paid_date,
          status: inv.status,
        });
      }

      const monthly = computeMonthlyStats(invoices, auditUserId);
      const totals = computeTotals(invoices, auditUserId);

      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const currentMonthCount = byMonth[currentKey]?.count ?? 0;

      const allUserIds = [...new Set(invoices.map((i) => i.user_id).filter(Boolean))];
      const matchingUserIds = allUserIds.filter((id) => userIdMatches(auditUserId, id));

      return NextResponse.json({
        user_id: auditUserId,
        paid_deals_total: paidDeals.length,
        counted_in_achievements: countedDeals.length,
        skipped_no_paid_date: skippedNoPaidDate.length,
        skipped_deals_preview: skippedNoPaidDate.slice(0, 5).map((i) => ({ user_id: i.user_id, status: i.status, paid_date: i.paid_date, invoice_amount: i.invoice_amount })),
        current_month: currentKey,
        current_month_count: currentMonthCount,
        lifetime_margin: totals.total_margin ?? 0,
        best_month_sales: monthly.monthly_paid_count,
        best_month_margin: monthly.monthly_margin,
        by_month: byMonth,
        statuses_in_data: [...new Set(userInvoices.map((i) => i.status))],
        paid_statuses_we_recognize: [...PAID_DEAL_STATUSES],
        all_user_ids_in_invoices: allUserIds,
        matching_user_ids: matchingUserIds,
        match_note: matchingUserIds.length > 0
          ? "user_id найден"
          : `user_id не совпадает. Варианты: ${allUserIds.slice(0, 10).join(", ")}`,
        note: "Данные из Google Sheets. Если CRM показывает больше — проверьте синхронизацию CRM → Sheets. Сделки без «Дата завершения» не учитываются.",
      });
    }

    if (funnel) {
      const debug = await fetchDebugSalesFunnelRaw();
      return NextResponse.json(debug);
    }
    if (raw) {
      const debug = await fetchDebugConnectionsRaw();
      return NextResponse.json(debug);
    }

    const companies = await fetchCompanies();
    const headers = companies.length > 0 ? Object.keys(companies[0] as object) : [];
    const sample = companies.slice(0, 3);
    const userIds = [...new Set(companies.map((c) => c.user_id).filter(Boolean))];

    return NextResponse.json({
      total_rows: companies.length,
      unique_user_ids: userIds.length,
      user_ids: userIds.slice(0, 20),
      sample_rows: sample,
      columns: headers,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
