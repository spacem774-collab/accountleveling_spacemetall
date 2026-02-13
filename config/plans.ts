/** План по продажам (сумма продаж / бюджет) на текущий месяц в рублях. 0 = без плана. */
export const MONTHLY_PLANS: Record<string, number> = {
  "Ружников Дмитрий Константинович": 200_000,
  "Кадыров Никита Дмитриевич": 150_000,
  "Гнусарёв Евгений Андреевич": 0,
};

function userIdMatchesPlan(userId: string, planKey: string): boolean {
  const a = String(userId ?? "").trim();
  const b = String(planKey ?? "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 8 && b.length >= 8 && (a.startsWith(b) || b.startsWith(a))) return true;
  return false;
}

export function getMonthlyPlan(userId: string): number {
  const exact = MONTHLY_PLANS[userId];
  if (typeof exact === "number") return exact;
  const key = Object.keys(MONTHLY_PLANS).find((k) => userIdMatchesPlan(userId, k));
  return key != null ? MONTHLY_PLANS[key] : 0;
}

/** Сумма планов всех указанных сотрудников. */
export function getDepartmentPlan(userIds: string[]): number {
  return userIds.reduce((sum, id) => sum + getMonthlyPlan(id), 0);
}
