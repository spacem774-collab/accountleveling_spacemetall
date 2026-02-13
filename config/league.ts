export interface League {
  id: string;
  name: string;
  min: number;
  max: number;
  color_hex: string;
  badge_image_path: string;
}

export const LEAGUES: League[] = [
  {
    id: "bronze",
    name: "Bronze",
    min: 0,
    max: 99,
    color_hex: "#CD7F32",
    badge_image_path: "/badges/bronze.png",
  },
  {
    id: "silver",
    name: "Silver",
    min: 100,
    max: 299,
    color_hex: "#C0C0C0",
    badge_image_path: "/badges/silver.png",
  },
  {
    id: "gold",
    name: "Gold",
    min: 300,
    max: 899,
    color_hex: "#FFD700",
    badge_image_path: "/badges/gold.png",
  },
  {
    id: "platinum",
    name: "Platinum",
    min: 900,
    max: 1199,
    color_hex: "#E5E4E2",
    badge_image_path: "/badges/platinum.png",
  },
  {
    id: "diamond",
    name: "Diamond",
    min: 1200,
    max: 1499,
    color_hex: "#B9F2FF",
    badge_image_path: "/badges/diamond.png",
  },
  {
    id: "master",
    name: "Master",
    min: 1500,
    max: 1749,
    color_hex: "#9B59B6",
    badge_image_path: "/badges/master.png",
  },
  {
    id: "legend",
    name: "Legend",
    min: 1750,
    max: Infinity,
    color_hex: "#FF6B35",
    badge_image_path: "/badges/legend.png",
  },
];

export interface Bucket {
  id: string;
  label: string;
  min: number;
  max: number;
}

export const BUCKETS: Bucket[] = [
  { id: "<50k", label: "< 50 000", min: 0, max: 49999 },
  { id: "50-200k", label: "50 000 – 200 000", min: 50000, max: 199999 },
  { id: "200-500k", label: "200 000 – 500 000", min: 200000, max: 499999 },
  { id: "500k-1M", label: "500 000 – 1 000 000", min: 500000, max: 999999 },
  { id: ">1M", label: "> 1 000 000", min: 1000000, max: Infinity },
];

export function getLeague(companiesCount: number): League {
  const league = LEAGUES.find(
    (l) => companiesCount >= l.min && companiesCount <= l.max
  );
  return league ?? LEAGUES[0];
}

/** Следующая лига (null если уже Legend) */
export function getNextLeague(companiesCount: number): League | null {
  const idx = LEAGUES.findIndex(
    (l) => companiesCount >= l.min && companiesCount <= l.max
  );
  if (idx < 0 || idx >= LEAGUES.length - 1) return null;
  return LEAGUES[idx + 1];
}

/** Прогресс до следующей лиги: 0–1 (1 = готов к переходу). null если Legend */
export function getProgressToNextLeague(companiesCount: number): number | null {
  const current = getLeague(companiesCount);
  const next = getNextLeague(companiesCount);
  if (!next) return null;
  const range = next.min - current.min;
  const progress = companiesCount - current.min;
  return Math.min(1, Math.max(0, progress / range));
}
