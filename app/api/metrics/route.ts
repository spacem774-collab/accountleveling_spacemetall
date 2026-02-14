import { NextRequest, NextResponse } from "next/server";
import { fetchCompanies, fetchInvoices, fetchAbout } from "@/lib/sheets";
import { computeMetrics, getCompaniesCount, getCompaniesAddedInWeek, getPaidDealsInPeriod } from "@/lib/metrics";
import { getTasksForUser, userIdMatches, type TaskDefinition } from "@/config/tasks";

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

    const allUserIds = [...new Set([...companies.map((c) => c.user_id), ...invoices.map((i) => i.user_id)].filter(Boolean))];
    const taskDefs = getTasksForUser(userId);
    const companiesCount = metrics.companies_count;
    const metricUserId = (t: TaskDefinition) =>
      t.mentee_user_id_match ? allUserIds.find((id) => userIdMatches(t.mentee_user_id_match!, id)) ?? userId : userId;
    const tasks = taskDefs.map((t: TaskDefinition) => {
      const uid = metricUserId(t);
      let current = 0;
      if (t.metric === "connections") {
        const connCount = uid === userId ? companiesCount : getCompaniesCount(companies, uid);
        current =
          t.baseline != null
            ? Math.max(0, connCount - t.baseline)
            : (t.week_start ? getCompaniesAddedInWeek(companies, uid, t.week_start, t.week_end) : 0);
      } else if (t.metric === "paid_deals") {
        current = getPaidDealsInPeriod(invoices, uid, t.week_start!, t.week_end);
      }
      return {
        id: t.id,
        type: t.type,
        target: t.target,
        current,
        reward: t.reward,
        completed: current >= t.target,
        description: t.description,
        unit: t.metric === "paid_deals" ? "сделок" : "связок",
      };
    });

    return NextResponse.json({
      ...metrics,
      about_text: about?.about_text ?? "",
      about_updated_at: about?.updated_at ?? null,
      avatar_url: about?.avatar_url ?? null,
      tasks: tasks.length > 0 ? tasks : undefined,
    });
  } catch (err) {
    console.error("Metrics API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
