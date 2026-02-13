/**
 * Ранг Hard Skills — зависит от:
 * - Lifetime маржа (общая маржа принесённая в компанию, руб)
 * - Конверсия (текущая, в %)
 * - Оплаченные счета (количество)
 *
 * Берётся наивысший ранг, где выполнены ВСЕ минимальные пороги.
 */

export interface HardSkillsRank {
  id: string;
  emoji: string;
  letter: string;
  name: string;
  /** Минимальная маржа (руб) для ранга */
  marginMin: number;
  /** Минимальная конверсия (%) для ранга */
  conversionMin: number;
  /** Минимальное кол-во оплаченных счетов для ранга */
  paidCountMin: number;
}

export const HARD_SKILLS_RANKS: HardSkillsRank[] = [
  { id: "s", emoji: "🔥", letter: "S", name: "Легенда SpaceMetall", marginMin: 15_000_000, conversionMin: 15, paidCountMin: 500 },
  { id: "a", emoji: "💎", letter: "A", name: "Ядро компании", marginMin: 6_000_000, conversionMin: 13, paidCountMin: 250 },
  { id: "b", emoji: "🥇", letter: "B", name: "Системный", marginMin: 2_000_000, conversionMin: 11, paidCountMin: 100 },
  { id: "c", emoji: "🥈", letter: "C", name: "Игрок базы", marginMin: 500_000, conversionMin: 8, paidCountMin: 30 },
  { id: "d", emoji: "🥉", letter: "D", name: "Начальный", marginMin: 0, conversionMin: 0, paidCountMin: 0 },
];

/**
 * Определяет ранг Hard Skills по метрикам.
 * Берётся наивысший ранг, для которого ВСЕ минимальные пороги выполнены.
 */
export function getHardSkillsRank(
  totalMargin: number,
  conversionPercent: number,
  paidCount: number
): HardSkillsRank {
  for (const rank of HARD_SKILLS_RANKS) {
    if (
      totalMargin >= rank.marginMin &&
      conversionPercent >= rank.conversionMin &&
      paidCount >= rank.paidCountMin
    ) {
      return rank;
    }
  }
  return HARD_SKILLS_RANKS[HARD_SKILLS_RANKS.length - 1];
}
