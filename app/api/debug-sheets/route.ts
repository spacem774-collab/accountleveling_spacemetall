import { NextResponse } from "next/server";
import { fetchCompanies, fetchDebugConnectionsRaw, fetchDebugSalesFunnelRaw } from "@/lib/sheets";

/** Отладка: ?raw=1 — связки, ?funnel=1 — воронка продаж */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("raw") === "1";
  const funnel = searchParams.get("funnel") === "1";

  try {
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
