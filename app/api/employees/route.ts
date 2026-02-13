import { NextResponse } from "next/server";
import { fetchCompanies, fetchInvoices } from "@/lib/sheets";
import { getCompaniesCount, computeTotals, computeMaxMonthlyBudget, computeMonthlyStats } from "@/lib/metrics";
import { getLeague, LEAGUES } from "@/config/league";
import { getHardSkillsRank } from "@/config/hardSkills";
import { countAchievements } from "@/lib/achievementsCatalog";

/** Порядок лиг для сортировки: индекс в LEAGUES (Legend=6, Bronze=0) — выше индекс = выше приоритет */
const LEAGUE_SORT_ORDER = Object.fromEntries(LEAGUES.map((l, i) => [l.id, i]));

/** Порядок Hard Skills: S > A > B > C > D */
const HS_SORT_ORDER: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

export interface EmployeeItem {
  user_id: string;
  companies_count: number;
  league_name: string;
  league_color_hex: string;
  badge_image_path: string;
  /** Общая маржа в рублях (lifetime) */
  total_margin: number;
  /** Конверсия в процентах (0–100) */
  conversion_percent: number;
  /** Количество выставленных счетов */
  issued_count: number;
  /** Количество оплаченных счетов */
  paid_count: number;
  /** Ранг Hard Skills */
  hard_skills: {
    emoji: string;
    letter: string;
    name: string;
  };
  /** Общее количество полученных ачивок */
  total_achievements: number;
}

function getExcludedUserIds(): string[] {
  const raw = process.env.EXCLUDED_FROM_EMPLOYEES ?? "Корецкий";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function GET() {
  try {
    const [companies, invoices] = await Promise.all([
      fetchCompanies(),
      fetchInvoices(),
    ]);
    const excluded = getExcludedUserIds();
    const userIds = [...new Set(companies.map((c) => c.user_id).filter(Boolean))]
      .filter((id) => !excluded.some((ex) => id.includes(ex) || ex.includes(id)))
      .sort();

    const employees: EmployeeItem[] = userIds.map((userId) => {
      const companies_count = getCompaniesCount(companies, userId);
      const league = getLeague(companies_count);
      const totals = computeTotals(invoices, userId);
      const maxMonthlyBudget = computeMaxMonthlyBudget(invoices, userId);
      const { monthly_paid_count: maxMonthlySales } = computeMonthlyStats(invoices, userId);
      const conversionPercent = totals.issued_total > 0
        ? (totals.conversion_total * 100)
        : 0;
      const hardSkills = getHardSkillsRank(
        totals.total_margin ?? 0,
        conversionPercent,
        totals.paid_total
      );
      const total_achievements = countAchievements(
        totals.paid_total,
        totals.budget_total ?? 0,
        maxMonthlyBudget,
        maxMonthlySales
      );
      return {
        user_id: userId,
        companies_count,
        league_name: league.name,
        league_color_hex: league.color_hex,
        badge_image_path: league.badge_image_path,
        total_margin: totals.total_margin ?? 0,
        conversion_percent: conversionPercent,
        issued_count: totals.issued_total,
        paid_count: totals.paid_total,
        hard_skills: {
          emoji: hardSkills.emoji,
          letter: hardSkills.letter,
          name: hardSkills.name,
        },
        total_achievements,
      };
    });

    // Сортировка: приоритет 1 — лига, приоритет 2 — Hard Skills
    employees.sort((a, b) => {
      const leagueOrderA = LEAGUE_SORT_ORDER[a.league_name.toLowerCase()] ?? 0;
      const leagueOrderB = LEAGUE_SORT_ORDER[b.league_name.toLowerCase()] ?? 0;
      if (leagueOrderB !== leagueOrderA) return leagueOrderB - leagueOrderA;

      const hsOrderA = HS_SORT_ORDER[a.hard_skills.letter] ?? 0;
      const hsOrderB = HS_SORT_ORDER[b.hard_skills.letter] ?? 0;
      return hsOrderB - hsOrderA;
    });

    return NextResponse.json(
      { employees },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("Employees API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
