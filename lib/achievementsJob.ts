/**
 * Job расчёта и выдачи ачивок по закрытым сделкам в месяц.
 * Читает Google Sheets, фильтрует по статусу «Успешно реализовано»,
 * группирует по сотруднику и месяцу, обновляет user_achievements.
 */

import { fetchDealsFromSheet, normalizeDateToMonthKey, PAID_STATUS } from "@/lib/sheetsClient";
import {
  upsertUserAchievements,
  getUserAchievements,
} from "@/lib/achievementsStore";
import { ACHIEVEMENTS_CATALOG } from "@/lib/achievementsCatalog";
import type { UserAchievement, MonthlyClosedCount } from "@/lib/types/achievements";

export interface JobResult {
  rowsRead: number;
  rowsFiltered: number;
  achievementsUpdated: number;
  errors: string[];
}

/**
 * Выполняет job: читает сделки, считает monthlyClosedCount, обновляет user_achievements.
 */
export async function runAchievementsJob(): Promise<JobResult> {
  const errors: string[] = [];
  let rowsRead = 0;
  let rowsFiltered = 0;
  let achievementsUpdated = 0;

  try {
    const { rows, totalRead } = await fetchDealsFromSheet();
    rowsRead = totalRead;

    // Фильтр: только «Успешно реализовано»
    const paid = rows.filter((r) => {
      const s = String(r.status ?? "").trim();
      return s === PAID_STATUS;
    });
    rowsFiltered = paid.length;

    // Подсчёт по сотруднику и месяцу (YYYY-MM)
    const byUserMonth = new Map<string, number>();
    // Общее количество продаж по сотруднику (для total_sales)
    const byUserTotal = new Map<string, number>();

    for (const r of paid) {
      const monthKey = normalizeDateToMonthKey(r.completionDate);
      const userId = r.userId;
      if (!userId) continue;

      if (monthKey) {
        const key = `${userId}\t${monthKey}`;
        byUserMonth.set(key, (byUserMonth.get(key) ?? 0) + 1);
      }
      byUserTotal.set(userId, (byUserTotal.get(userId) ?? 0) + 1);
    }

    // Формируем monthlyClosedCount[]
    const monthlyCounts: MonthlyClosedCount[] = [];
    for (const [k, count] of byUserMonth) {
      const [userId, monthKey] = k.split("\t");
      if (userId && monthKey) {
        monthlyCounts.push({ userId, monthKey, count });
      }
    }

    // Определяем achieved для каждой ачивки
    const toUpsert: UserAchievement[] = [];
    const now = new Date().toISOString();
    const LIFETIME_MONTH = "all";

    // 1. Monthly achievements (5/10/20/35/50)
    for (const { userId, monthKey, count } of monthlyCounts) {
      for (const catalogItem of ACHIEVEMENTS_CATALOG) {
        if (catalogItem.type !== "monthly_sales") continue;
        const achieved = count >= catalogItem.threshold;
        toUpsert.push({
          userId,
          achievementId: catalogItem.id,
          monthKey,
          achieved,
          achievedAt: achieved ? now : null,
        });
      }
    }

    // 2. Total sales achievements (5, 10, 20 ... 300) — monthKey="all"
    for (const [userId, totalCount] of byUserTotal) {
      for (const catalogItem of ACHIEVEMENTS_CATALOG) {
        if (catalogItem.type !== "total_sales") continue;
        const achieved = totalCount >= catalogItem.threshold;
        toUpsert.push({
          userId,
          achievementId: catalogItem.id,
          monthKey: LIFETIME_MONTH,
          achieved,
          achievedAt: achieved ? now : null,
        });
      }
    }

    achievementsUpdated = await upsertUserAchievements(toUpsert);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return {
    rowsRead,
    rowsFiltered,
    achievementsUpdated,
    errors,
  };
}

export { getUserAchievements };
