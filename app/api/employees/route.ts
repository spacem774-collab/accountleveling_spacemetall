import { NextResponse } from "next/server";
import { fetchCompanies } from "@/lib/sheets";
import { getCompaniesCount } from "@/lib/metrics";
import { getLeague } from "@/config/league";

export interface EmployeeItem {
  user_id: string;
  companies_count: number;
  league_name: string;
  league_color_hex: string;
  badge_image_path: string;
}

function getExcludedUserIds(): string[] {
  const raw = process.env.EXCLUDED_FROM_EMPLOYEES ?? "Корецкий";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function GET() {
  try {
    const companies = await fetchCompanies();
    const excluded = getExcludedUserIds();
    const userIds = [...new Set(companies.map((c) => c.user_id).filter(Boolean))]
      .filter((id) => !excluded.some((ex) => id.includes(ex) || ex.includes(id)))
      .sort();

    const employees: EmployeeItem[] = userIds.map((userId) => {
      const companies_count = getCompaniesCount(companies, userId);
      const league = getLeague(companies_count);
      return {
        user_id: userId,
        companies_count,
        league_name: league.name,
        league_color_hex: league.color_hex,
        badge_image_path: league.badge_image_path,
      };
    });

    return NextResponse.json({ employees });
  } catch (err) {
    console.error("Employees API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
