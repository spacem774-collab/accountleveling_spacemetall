/**
 * Типы для системы достижений (ачивок)
 */

/** Каталог достижений — пороги по закрытым сделкам и марже */
export type AchievementCategory = "monthly_sales" | "total_sales" | "total_margin" | "max_monthly_budget" | "max_monthly_sales";

export interface AchievementCatalogItem {
  id: string;
  key: string;
  title: string;
  description: string;
  threshold: number;
  type: AchievementCategory;
}

/** Связь пользователя с достижением за конкретный месяц */
export interface UserAchievement {
  userId: string;
  achievementId: string;
  monthKey: string; // YYYY-MM
  achieved: boolean;
  achievedAt: string | null; // ISO date when achieved
}

/** Сырая строка сделки из Google Sheets (после парсинга) */
export interface DealRow {
  userId: string;
  status: string;
  completionDate: string | undefined; // исходное значение
}

/** Подсчёт закрытых сделок по сотруднику и месяцу */
export interface MonthlyClosedCount {
  userId: string;
  monthKey: string;
  count: number;
}

/** Конфиг колонок для job (из env) */
export interface AchievementsJobConfig {
  sheetId: string;
  range: string;
  columnStatusName: string;
  columnDoneDate: string;
  columnManager: string;
  paidStatus: string;
}
