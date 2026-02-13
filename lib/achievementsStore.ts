/**
 * Хранилище user_achievements.
 * Реализация: JSON-файл. Интерфейс готов для замены на Postgres.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { UserAchievement } from "@/lib/types/achievements";

const DATA_DIR = process.env.ACHIEVEMENTS_DATA_DIR ?? path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "achievements.json");

interface StoreData {
  userAchievements: UserAchievement[];
  updatedAt: string;
}

const EMPTY: StoreData = {
  userAchievements: [],
  updatedAt: new Date().toISOString(),
};

async function ensureDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function load(): Promise<StoreData> {
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as StoreData;
    if (!parsed.userAchievements || !Array.isArray(parsed.userAchievements)) {
      return EMPTY;
    }
    return parsed;
  } catch {
    return EMPTY;
  }
}

async function save(data: StoreData): Promise<void> {
  await ensureDir();
  await writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/** Получить все user_achievements для пользователя и месяца */
export async function getUserAchievements(
  userId: string,
  monthKey: string
): Promise<UserAchievement[]> {
  const data = await load();
  return data.userAchievements.filter(
    (u) => u.userId === userId && u.monthKey === monthKey
  );
}

/** Upsert: обновить или вставить запись. Идемпотентно по (userId, achievementId, monthKey). */
export async function upsertUserAchievement(ua: UserAchievement): Promise<void> {
  const data = await load();
  const idx = data.userAchievements.findIndex(
    (x) =>
      x.userId === ua.userId &&
      x.achievementId === ua.achievementId &&
      x.monthKey === ua.monthKey
  );
  const record: UserAchievement = {
    userId: ua.userId,
    achievementId: ua.achievementId,
    monthKey: ua.monthKey,
    achieved: ua.achieved,
    achievedAt: ua.achievedAt,
  };
  if (idx >= 0) {
    data.userAchievements[idx] = record;
  } else {
    data.userAchievements.push(record);
  }
  data.updatedAt = new Date().toISOString();
  await save(data);
}

/** Массовый upsert — идемпотентно */
export async function upsertUserAchievements(
  items: UserAchievement[]
): Promise<number> {
  if (items.length === 0) return 0;
  const data = await load();
  const seen = new Set<string>();
  for (const ua of items) {
    const key = `${ua.userId}:${ua.achievementId}:${ua.monthKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const idx = data.userAchievements.findIndex(
      (x) =>
        x.userId === ua.userId &&
        x.achievementId === ua.achievementId &&
        x.monthKey === ua.monthKey
    );
    const record: UserAchievement = {
      userId: ua.userId,
      achievementId: ua.achievementId,
      monthKey: ua.monthKey,
      achieved: ua.achieved,
      achievedAt: ua.achievedAt,
    };
    if (idx >= 0) {
      data.userAchievements[idx] = record;
    } else {
      data.userAchievements.push(record);
    }
  }
  data.updatedAt = new Date().toISOString();
  await save(data);
  return items.length;
}
