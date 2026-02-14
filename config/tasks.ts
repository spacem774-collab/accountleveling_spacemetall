/**
 * Ежедневные и еженедельные задания сотрудников.
 * reward — награда в рублях за выполнение.
 */

export type TaskType = "daily" | "weekly";

export type TaskMetric = "connections" | "paid_deals"; // связки | закрытые сделки (Успешно реализовано) в воронке

export interface TaskDefinition {
  id: string;
  user_id_match: string; // ФИО или часть для сопоставления
  type: TaskType;
  metric: TaskMetric;
  target: number; // целевое значение (напр. 50 связок)
  reward: number; // награда в рублях
  /** Начало периода (YYYY-MM-DD). Для connections с baseline не используется. */
  week_start?: string;
  /** Конец периода (YYYY-MM-DD). Для connections с baseline не используется — конец контролируется вручную. */
  week_end?: string;
  /** Базовый уровень связок. В задание засчитывается всё свыше baseline (текущее количество − baseline). */
  baseline?: number;
  /** Задание наставника: считаем метрику подопечного (напр. сделки Евгения для Дмитрия). */
  mentee_user_id_match?: string;
  description?: string;
}

/** Задания. week_start = понедельник недели в формате YYYY-MM-DD */
export const TASKS: TaskDefinition[] = [
  {
    id: "evgeniy-connections-above-421",
    user_id_match: "Гнусарёв Евгений",
    type: "weekly",
    metric: "connections",
    target: 50,
    reward: 2000,
    baseline: 421,
    description: "50 новых связок за неделю (16–20 февраля)",
  },
  {
    id: "dmitry-mentor-evgeniy-2026-02-16",
    user_id_match: "Ружников Дмитрий",
    type: "weekly",
    metric: "paid_deals",
    target: 1,
    reward: 3000,
    week_start: "2026-02-16",
    week_end: "2026-02-20",
    mentee_user_id_match: "Гнусарёв Евгений",
    description: "Евгений закрыл 1 сделку в воронке (16–20 февраля)",
  },
  {
    id: "nikita-deals-2026-02-16",
    user_id_match: "Кадыров Никита",
    type: "weekly",
    metric: "paid_deals",
    target: 7,
    reward: 3000,
    week_start: "2026-02-16",
    week_end: "2026-02-20",
    description: "7 закрытых сделок в воронке (16–20 февраля)",
  },
];

export function userIdMatches(taskMatch: string, userId: string): boolean {
  const a = String(taskMatch ?? "").trim();
  const b = String(userId ?? "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.includes(a) || a.includes(b)) return true;
  return false;
}

/** Задания для сотрудника по user_id */
export function getTasksForUser(userId: string): TaskDefinition[] {
  return TASKS.filter((t) => userIdMatches(t.user_id_match, userId));
}
