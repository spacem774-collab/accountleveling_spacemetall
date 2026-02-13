import { NextRequest, NextResponse } from "next/server";
import { getUserAchievements } from "@/lib/achievementsJob";
import {
  ACHIEVEMENTS_CATALOG,
  mergeAchievementsWithUserData,
} from "@/lib/achievementsCatalog";

/** Текущий месяц в формате YYYY-MM */
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * GET /api/achievements?user_id=XXX&month=YYYY-MM
 * Возвращает каталог ачивок с achieved для выбранного месяца.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    const monthParam = request.nextUrl.searchParams.get("month");
    const monthKey =
      monthParam === "all"
        ? "all"
        : monthParam && /^\d{4}-\d{2}$/.test(monthParam)
          ? monthParam
          : getCurrentMonthKey();

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const userAchievements = await getUserAchievements(userId, monthKey);
    const merged = mergeAchievementsWithUserData(
      ACHIEVEMENTS_CATALOG,
      userAchievements
    );

    return NextResponse.json({
      user_id: userId,
      month: monthKey,
      achievements: merged,
    });
  } catch (err) {
    console.error("Achievements API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
