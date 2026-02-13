/**
 * Каталог ачивок achievements_catalog.
 * - monthly_sales — пороги 5, 10, 20, 35, 50 закрытых сделок в месяц.
 * - total_sales — общее количество продаж: 5, 10, 20 ... до 300.
 * - total_margin — итого по бюджету (сумма продаж): 100к ... 30 млн.
 * - max_monthly_budget — максимальная маржа (бюджет) в одном месяце: 50к ... 5 млн.
 * - max_monthly_sales — максимальное количество продаж в одном месяце: 1 ... 50.
 */

import type { AchievementCatalogItem, UserAchievement } from "@/lib/types/achievements";

/** Пороги для ачивок "Продажи в месяц" (1, 5, 10... 50) */
const MAX_MONTHLY_SALES_THRESHOLDS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

/** Пороги для ачивок "Максимальная маржа в месяц" (50к — 5 млн ₽) */
const MAX_MONTHLY_BUDGET_THRESHOLDS = [
  50_000, 75_000, 100_000, 150_000, 200_000, 250_000, 300_000, 400_000, 500_000,
  600_000, 750_000, 1_000_000, 1_250_000, 1_500_000, 2_000_000, 2_500_000,
  3_000_000, 4_000_000, 5_000_000,
];

/** Пороги для ачивок "Общая маржа" (100к — 30 млн ₽) */
const TOTAL_MARGIN_THRESHOLDS = [
  100_000, 250_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000, 2_500_000,
  3_000_000, 4_000_000, 5_000_000, 7_000_000, 10_000_000, 15_000_000, 20_000_000,
  25_000_000, 30_000_000,
];

function formatMarginTitle(rubles: number): string {
  if (rubles >= 1_000_000) {
    const m = rubles / 1_000_000;
    return m === Math.floor(m) ? `${m} млн ₽` : `${m.toFixed(1)} млн ₽`;
  }
  return `${(rubles / 1_000).toFixed(0)} тыс. ₽`;
}

/** Пороги для ачивок "Общее количество продаж" (5, 10, 20, 30 ... 300) */
const TOTAL_SALES_THRESHOLDS = [
  5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  120, 140, 160, 180, 200, 220, 240, 260, 280, 300,
];

const MONTHLY_ACHIEVEMENTS: AchievementCatalogItem[] = [
  {
    id: "ms-5",
    key: "monthly_sales_5",
    title: "5 продаж",
    description: "5 закрытых сделок за месяц",
    threshold: 5,
    type: "monthly_sales",
  },
  {
    id: "ms-10",
    key: "monthly_sales_10",
    title: "10 продаж",
    description: "10 закрытых сделок за месяц",
    threshold: 10,
    type: "monthly_sales",
  },
  {
    id: "ms-20",
    key: "monthly_sales_20",
    title: "20 продаж",
    description: "20 закрытых сделок за месяц",
    threshold: 20,
    type: "monthly_sales",
  },
  {
    id: "ms-35",
    key: "monthly_sales_35",
    title: "35 продаж",
    description: "35 закрытых сделок за месяц",
    threshold: 35,
    type: "monthly_sales",
  },
  {
    id: "ms-50",
    key: "monthly_sales_50",
    title: "50 продаж",
    description: "50 закрытых сделок за месяц",
    threshold: 50,
    type: "monthly_sales",
  },
];

const TOTAL_ACHIEVEMENTS: AchievementCatalogItem[] = TOTAL_SALES_THRESHOLDS.map((t) => ({
  id: `ts-${t}`,
  key: `total_sales_${t}`,
  title: `${t} продаж`,
  description: `${t} закрытых сделок всего`,
  threshold: t,
  type: "total_sales",
}));

export const ACHIEVEMENTS_CATALOG: AchievementCatalogItem[] = [
  ...MONTHLY_ACHIEVEMENTS,
  ...TOTAL_ACHIEVEMENTS,
];

/** Ачивки только по общему количеству продаж (для блока на dashboard) */
export const TOTAL_SALES_CATALOG = TOTAL_ACHIEVEMENTS;

/** Ачивки по итого по бюджету / сумма продаж (100к — 30 млн ₽). Вычисляются из totals.budget_total на dashboard */
const TOTAL_MARGIN_ACHIEVEMENTS: AchievementCatalogItem[] = TOTAL_MARGIN_THRESHOLDS.map((t) => ({
  id: `tm-${t}`,
  key: `total_margin_${t}`,
  title: formatMarginTitle(t),
  description: `Сумма продаж ${formatMarginTitle(t)} и выше`,
  threshold: t,
  type: "total_margin",
}));

export const MARGIN_ACHIEVEMENTS_CATALOG = TOTAL_MARGIN_ACHIEVEMENTS;

/** Ачивки по максимальной марже в одном месяце (50к — 5 млн ₽). Из metrics.max_monthly_budget */
const MAX_MONTHLY_BUDGET_ACHIEVEMENTS: AchievementCatalogItem[] = MAX_MONTHLY_BUDGET_THRESHOLDS.map((t) => ({
  id: `mmb-${t}`,
  key: `max_monthly_budget_${t}`,
  title: formatMarginTitle(t),
  description: `Рекордная маржа (бюджет) в одном месяце: ${formatMarginTitle(t)} и выше`,
  threshold: t,
  type: "max_monthly_budget",
}));

export const MAX_MONTHLY_BUDGET_CATALOG = MAX_MONTHLY_BUDGET_ACHIEVEMENTS;

/** Ачивки по максимальному количеству продаж в одном месяце (1 — 50) */
const MAX_MONTHLY_SALES_ACHIEVEMENTS: AchievementCatalogItem[] = MAX_MONTHLY_SALES_THRESHOLDS.map((t) => ({
  id: `mms-${t}`,
  key: `max_monthly_sales_${t}`,
  title: `${t} ${t === 1 ? "продажа" : t >= 2 && t <= 4 ? "продажи" : "продаж"} в месяц`,
  description: `${t} закрытых сделок в одном месяце`,
  threshold: t,
  type: "max_monthly_sales",
}));

export const MAX_MONTHLY_SALES_CATALOG = MAX_MONTHLY_SALES_ACHIEVEMENTS;

/** Подсчёт общего количества полученных ачивок по метрикам (без monthly_sales) */
export function countAchievements(
  paidCount: number,
  budgetTotal: number,
  maxMonthlyBudget: number,
  maxMonthlySales: number
): number {
  const salesCount = TOTAL_SALES_THRESHOLDS.filter((t) => paidCount >= t).length;
  const budgetCount = TOTAL_MARGIN_THRESHOLDS.filter((t) => budgetTotal >= t).length;
  const maxMonthlyBudgetCount = MAX_MONTHLY_BUDGET_THRESHOLDS.filter((t) => maxMonthlyBudget >= t).length;
  const maxMonthlySalesCount = MAX_MONTHLY_SALES_THRESHOLDS.filter((t) => maxMonthlySales >= t).length;
  return salesCount + budgetCount + maxMonthlyBudgetCount + maxMonthlySalesCount;
}

/** Преобразует user_achievements в achieved для каталога (для выбранного месяца) */
export function mergeAchievementsWithUserData(
  catalog: AchievementCatalogItem[],
  userAchievements: UserAchievement[]
): Array<AchievementCatalogItem & { achieved: boolean }> {
  const byId = new Map<string, boolean>();
  for (const ua of userAchievements) {
    byId.set(ua.achievementId, ua.achieved);
  }
  return catalog.map((a) => ({
    ...a,
    achieved: byId.get(a.id) ?? false,
  }));
}
