import { NextRequest, NextResponse } from "next/server";
import { fetchCompanies, fetchInvoices, fetchAbout } from "@/lib/sheets";
import { computeMetrics } from "@/lib/metrics";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const [companies, invoices, about] = await Promise.all([
      fetchCompanies(),
      fetchInvoices(),
      fetchAbout(userId),
    ]);

    const metrics = computeMetrics(companies, invoices, userId);

    return NextResponse.json({
      ...metrics,
      about_text: about?.about_text ?? "",
      about_updated_at: about?.updated_at ?? null,
      avatar_url: about?.avatar_url ?? null,
    });
  } catch (err) {
    console.error("Metrics API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
