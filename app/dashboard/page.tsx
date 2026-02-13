"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getNextLeague, getProgressToNextLeague } from "@/config/league";
import { getMonthlyPlan } from "@/config/plans";
import { MARGIN_ACHIEVEMENTS_CATALOG, MAX_MONTHLY_BUDGET_CATALOG, MAX_MONTHLY_SALES_CATALOG } from "@/lib/achievementsCatalog";

interface League {
  id: string;
  name: string;
  color_hex: string;
  badge_image_path: string;
}

interface Totals {
  issued_total: number;
  paid_total: number;
  conversion_total: number;
  paid_sum_total: number;
  budget_total?: number;
  total_margin?: number;
}

interface BucketMetrics {
  bucket_id: string;
  label: string;
  issued_count_bucket: number;
  paid_count_bucket: number;
  conversion_bucket: number;
  paid_sum_bucket: number;
  avg_margin_bucket?: number;
  budget_sum_bucket?: number;
}

interface AchievementItem {
  id: string;
  title: string;
  description: string;
  threshold: number;
  type: string;
  achieved: boolean;
}

interface MetricsData {
  user_id: string;
  companies_count: number;
  league: League;
  totals: Totals;
  buckets: BucketMetrics[];
  cancelled: { count: number };
  max_monthly_budget?: number;
  max_monthly_paid_count?: number;
  current_month_budget?: number;
  updated_at: string;
  about_text?: string;
  about_updated_at?: string | null;
  avatar_url?: string | null;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatMargin(n: number): string {
  return n >= 0 && n <= 1 ? `${(n * 100).toFixed(1)}%` : `${n.toFixed(1)}%`;
}

const DEFAULT_AVATARS: Record<string, string> = {
  "Ружников Дмитрий Константинович": "/avatars/ruznikov.png",
  "Кадыров Никита Дмитриевич": "/avatars/kadyrov.png",
  "Гнусарёв Евгений Андреевич": "/avatars/gnusarev.png",
};

function getDefaultAvatar(userId: string): string | null {
  return DEFAULT_AVATARS[userId] ?? null;
}

function LeagueProgressBar({
  companiesCount,
  currentLeague,
}: {
  companiesCount: number;
  currentLeague: League;
}) {
  const nextLeague = getNextLeague(companiesCount);
  const progress = getProgressToNextLeague(companiesCount);

  if (!nextLeague || progress === null) {
    return (
      <p className="text-sm text-[#1A2F50]/60 mt-2 flex items-center gap-2">
        <span className="font-medium" style={{ color: "#FF6B35" }}>★</span>
        Максимальный ранг — Legend!
      </p>
    );
  }

  const percent = Math.round(progress * 100);
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-[#1A2F50]/70 mb-1">
        <span>Опыт до {nextLeague.name}</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="h-5 w-full rounded-full bg-[#1A2F50]/10 overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full bg-[#1A2F50] transition-all duration-700 ease-out shadow-[0_0_8px_rgba(26,47,80,0.4)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id");

  const [data, setData] = useState<MetricsData | null>(null);
  const [aboutText, setAboutText] = useState("");
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutSaved, setAboutSaved] = useState(false);
  const [aboutError, setAboutError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [totalAchievements, setTotalAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = (isInitial: boolean) => {
    if (!userId) return;
    if (isInitial) {
      setLoading(true);
      setError(null);
    }
    fetch(`/api/metrics?user_id=${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((json: MetricsData) => {
        setData(json);
        setAboutText(json.about_text ?? "");
        setError(null);
      })
      .catch((err) => {
        if (isInitial) setError(err.message ?? "Ошибка загрузки данных");
      })
      .finally(() => { if (isInitial) setLoading(false); });
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError("Укажите user_id в параметрах: /dashboard?user_id=XXX");
      return;
    }
    fetchMetrics(true);
    const interval = setInterval(() => fetchMetrics(false), 30_000);
    return () => clearInterval(interval);
  }, [userId]);

  // Загрузка ачивок «Общее количество продаж»
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/achievements?user_id=${encodeURIComponent(userId)}&month=all`)
      .then((res) => (res.ok ? res.json() : { achievements: [] }))
      .then((json: { achievements?: AchievementItem[] }) => {
        const list = json.achievements ?? [];
        setTotalAchievements(list.filter((a) => a.type === "total_sales"));
      })
      .catch(() => setTotalAchievements([]));
  }, [userId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("file", file);
      const res = await fetch("/api/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { avatar_url } = await res.json();
      setData((prev) => (prev ? { ...prev, avatar_url } : null));
    } catch {
      setError("Ошибка загрузки фото");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveAbout = async () => {
    if (!userId) return;
    setAboutSaving(true);
    setAboutSaved(false);
    setAboutError(null);
    try {
      const res = await fetch("/api/about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, about_text: aboutText }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? `Ошибка ${res.status}`);
      }
      setAboutSaved(true);
      setData((prev) =>
        prev
          ? {
              ...prev,
              about_text: aboutText,
              about_updated_at: new Date().toISOString(),
            }
          : null
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка сохранения";
      setAboutError(msg);
    } finally {
      setAboutSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <DashboardHeader />
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="text-lg text-[#1A2F50]/70">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <DashboardHeader />
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md border border-[#e2e4e8]">
            <h1 className="text-xl font-semibold text-[#E6004B] mb-2">Ошибка</h1>
            <p className="text-[#1A2F50]/80">{error}</p>
            <p className="mt-4 text-sm text-[#1A2F50]/60">
              Пример: /dashboard?user_id=demo_user
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { league, totals, buckets, cancelled } = data;

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader />
      <main className="flex-1 py-8 px-4 bg-[#f5f6f8]">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 1. Карточка профиля: фото + иконка ранга */}
        <section
          className="rounded-xl p-6 shadow-md border-2 flex items-center gap-5 bg-white"
          style={{ borderColor: "#1A2F50" }}
        >
          {/* Фото сотрудника с загрузкой */}
          <label className="relative flex-shrink-0 cursor-pointer group block">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={handleAvatarUpload}
              disabled={avatarUploading}
            />
            <div
              className="relative w-24 h-24 rounded-full overflow-hidden bg-[#1A2F50]/10 flex items-center justify-center transition-all"
              style={{
                border: "3px solid #1A2F50",
                boxShadow: "0 0 12px rgba(26,47,80,0.4)",
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden group-hover:opacity-90">
                {(data.avatar_url || getDefaultAvatar(data.user_id)) ? (
                  <img
                    src={data.avatar_url || getDefaultAvatar(data.user_id)!}
                    alt="Фото сотрудника"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-10 h-10 text-[#1A2F50]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors rounded-full pointer-events-none">
                <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition-opacity">
                  {avatarUploading ? "..." : "Загрузить"}
                </span>
              </div>
            </div>
          </label>

          {/* Иконка ранга (подгружается автоматически по companies_count) */}
          <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
            <img
              src={league.badge_image_path}
              alt={`Ранг ${league.name}`}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#1A2F50]">
              {league.name}
            </h1>
            <p className="text-[#1A2F50]/70 mt-1">
              Компаний с контактом: <strong>{formatNumber(data.companies_count)}</strong>
            </p>
            <LeagueProgressBar companiesCount={data.companies_count} currentLeague={league} />
            {getMonthlyPlan(data.user_id) > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-[#1A2F50]/70 mb-1">
                  <span>План на текущий месяц</span>
                  <span className="font-medium">
                    {formatNumber(data.current_month_budget ?? 0)} ₽ / {formatNumber(getMonthlyPlan(data.user_id))} ₽
                  </span>
                </div>
                <div className="h-5 w-full rounded-full bg-[#1A2F50]/10 overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full bg-[#E6004B] transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, ((data.current_month_budget ?? 0) / getMonthlyPlan(data.user_id)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 2. Achievements — объединённый блок */}
        <section className="bg-white rounded-xl p-6 shadow-md border border-[#e2e4e8]">
          {(() => {
            const paidTotal = totals.paid_total ?? 0;
            const maxSales = data.max_monthly_paid_count ?? 0;
            const budgetTotal = totals.budget_total ?? 0;
            const maxBudget = data.max_monthly_budget ?? 0;
            const achievedTotal =
              totalAchievements.filter((a) => paidTotal >= a.threshold).length +
              MAX_MONTHLY_SALES_CATALOG.filter((a) => maxSales >= a.threshold).length +
              MARGIN_ACHIEVEMENTS_CATALOG.filter((a) => budgetTotal >= a.threshold).length +
              MAX_MONTHLY_BUDGET_CATALOG.filter((a) => maxBudget >= a.threshold).length;
            const totalCount =
              totalAchievements.length +
              MAX_MONTHLY_SALES_CATALOG.length +
              MARGIN_ACHIEVEMENTS_CATALOG.length +
              MAX_MONTHLY_BUDGET_CATALOG.length;
            return (
              <h2 className="text-xl font-semibold mb-6 text-[#1A2F50]">
                Achievements{" "}
                <span className="text-[#E6004B] font-medium">
                  {achievedTotal} / {totalCount}
                </span>
              </h2>
            );
          })()}

          {/* Подблок: Общее количество продаж */}
          <div className="pb-6 mb-6 border-b border-[#e2e4e8]">
            <h3 className="text-base font-medium mb-2 text-[#1A2F50]">Общее количество продаж</h3>
            <p className="text-sm text-[#1A2F50]/60 mb-3">
              Закрытых сделок всего: <strong>{formatNumber(totals.paid_total)}</strong>
            </p>
            {totalAchievements.length > 0 && (() => {
              const paidTotal = totals.paid_total ?? 0;
              const achievedCount = totalAchievements.filter((a) => paidTotal >= a.threshold).length;
              const progressPercent = (achievedCount / totalAchievements.length) * 100;
              return (
                <>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-[#1A2F50]/70 mb-1">
                      <span>{achievedCount} из {totalAchievements.length}</span>
                      <span className="font-medium text-[#E6004B]">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-4 w-full rounded-full bg-[#1A2F50]/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[#E6004B] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {totalAchievements.map((a) => {
                      const achieved = paidTotal >= a.threshold;
                      return (
                        <span key={a.id} title={a.description}
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            achieved ? "bg-[#E6004B] text-white border-2 border-[#E6004B] shadow-sm" : "bg-[#1A2F50]/5 text-[#1A2F50]/50 border border-[#1A2F50]/10"
                          }`}>
                          {achieved ? "✓ " : ""}{a.title}
                        </span>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Подблок: Продажи в месяц */}
          <div className="pb-6 mb-6 border-b border-[#e2e4e8]">
            <h3 className="text-base font-medium mb-2 text-[#1A2F50]">Продажи в месяц</h3>
            <p className="text-sm text-[#1A2F50]/60 mb-3">
              Рекорд продаж в одном месяце: <strong>{formatNumber(data.max_monthly_paid_count ?? 0)}</strong>
            </p>
            {(() => {
              const maxSales = data.max_monthly_paid_count ?? 0;
              const salesCatalog = MAX_MONTHLY_SALES_CATALOG;
              const achievedCount = salesCatalog.filter((a) => maxSales >= a.threshold).length;
              const progressPercent = salesCatalog.length > 0 ? (achievedCount / salesCatalog.length) * 100 : 0;
              return (
                <>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-[#1A2F50]/70 mb-1">
                      <span>{achievedCount} из {salesCatalog.length}</span>
                      <span className="font-medium text-[#E6004B]">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-4 w-full rounded-full bg-[#1A2F50]/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[#E6004B] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {salesCatalog.map((a) => {
                      const achieved = maxSales >= a.threshold;
                      return (
                        <span key={a.id} title={a.description}
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            achieved ? "bg-[#E6004B] text-white border-2 border-[#E6004B] shadow-sm" : "bg-[#1A2F50]/5 text-[#1A2F50]/50 border border-[#1A2F50]/10"
                          }`}>
                          {achieved ? "✓ " : ""}{a.title}
                        </span>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Подблок: Итого по бюджету */}
          <div className="pb-6 mb-6 border-b border-[#e2e4e8]">
            <h3 className="text-base font-medium mb-2 text-[#1A2F50]">Итого по бюджету</h3>
            <p className="text-sm text-[#1A2F50]/60 mb-3">
              Сумма продаж всего: <strong>{formatNumber(totals.budget_total ?? 0)} ₽</strong>
            </p>
            {(() => {
              const budgetTotal = totals.budget_total ?? 0;
              const marginCatalog = MARGIN_ACHIEVEMENTS_CATALOG;
              const achievedCount = marginCatalog.filter((a) => budgetTotal >= a.threshold).length;
              const progressPercent = marginCatalog.length > 0 ? (achievedCount / marginCatalog.length) * 100 : 0;
              return (
                <>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-[#1A2F50]/70 mb-1">
                      <span>{achievedCount} из {marginCatalog.length}</span>
                      <span className="font-medium text-[#E6004B]">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-4 w-full rounded-full bg-[#1A2F50]/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[#E6004B] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {marginCatalog.map((a) => {
                      const achieved = budgetTotal >= a.threshold;
                      return (
                        <span key={a.id} title={a.description}
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            achieved ? "bg-[#E6004B] text-white border-2 border-[#E6004B] shadow-sm" : "bg-[#1A2F50]/5 text-[#1A2F50]/50 border border-[#1A2F50]/10"
                          }`}>
                          {achieved ? "✓ " : ""}{a.title}
                        </span>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Подблок: Максимальная маржа в месяц */}
          <div>
            <h3 className="text-base font-medium mb-2 text-[#1A2F50]">Максимальная маржа в месяц</h3>
            <p className="text-sm text-[#1A2F50]/60 mb-3">
              Рекордная сумма по бюджету в одном месяце: <strong>{formatNumber(data.max_monthly_budget ?? 0)} ₽</strong>
            </p>
            {(() => {
              const maxBudget = data.max_monthly_budget ?? 0;
              const maxCatalog = MAX_MONTHLY_BUDGET_CATALOG;
              const achievedCount = maxCatalog.filter((a) => maxBudget >= a.threshold).length;
              const progressPercent = maxCatalog.length > 0 ? (achievedCount / maxCatalog.length) * 100 : 0;
              return (
                <>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-[#1A2F50]/70 mb-1">
                      <span>{achievedCount} из {maxCatalog.length}</span>
                      <span className="font-medium text-[#E6004B]">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-4 w-full rounded-full bg-[#1A2F50]/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[#E6004B] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {maxCatalog.map((a) => {
                      const achieved = maxBudget >= a.threshold;
                      return (
                        <span key={a.id} title={a.description}
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            achieved ? "bg-[#E6004B] text-white border-2 border-[#E6004B] shadow-sm" : "bg-[#1A2F50]/5 text-[#1A2F50]/50 border border-[#1A2F50]/10"
                          }`}>
                          {achieved ? "✓ " : ""}{a.title}
                        </span>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </section>

        {/* 3. Общая статистика */}
        <section className="bg-white rounded-xl p-6 shadow-md border border-[#e2e4e8]">
          <h2 className="text-lg font-semibold mb-4 text-[#1A2F50]">Общая статистика</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1A2F50]/5 rounded-lg p-4 border border-[#1A2F50]/10">
              <p className="text-sm text-[#1A2F50]/60">Выставлено счетов</p>
              <p className="text-xl font-bold text-[#1A2F50]">{formatNumber(totals.issued_total)}</p>
            </div>
            <div className="bg-[#1A2F50]/5 rounded-lg p-4 border border-[#1A2F50]/10">
              <p className="text-sm text-[#1A2F50]/60">Оплачено</p>
              <p className="text-xl font-bold text-[#1A2F50]">{formatNumber(totals.paid_total)}</p>
            </div>
            <div className="bg-[#E6004B]/5 rounded-lg p-4 border border-[#E6004B]/20">
              <p className="text-sm text-[#1A2F50]/60">Конверсия</p>
              <p className="text-xl font-bold text-[#E6004B]">{formatPercent(totals.conversion_total)}</p>
            </div>
            <div className="bg-[#1A2F50]/5 rounded-lg p-4 border border-[#1A2F50]/10">
              <p className="text-sm text-[#1A2F50]/60">Сумма оплат</p>
              <p className="text-xl font-bold text-[#1A2F50]">{formatNumber(totals.paid_sum_total)} ₽</p>
            </div>
            {totals.budget_total != null && (
              <div className="bg-[#1A2F50]/5 rounded-lg p-4 border border-[#1A2F50]/10 col-span-2 md:col-span-1">
                <p className="text-sm text-[#1A2F50]/60">Итого по бюджету (сумма продаж)</p>
                <p className="text-xl font-bold text-[#1A2F50]">{formatNumber(totals.budget_total)} ₽</p>
              </div>
            )}
          </div>
        </section>

        {/* 4. Таблица по бакетам */}
        <section className="bg-white rounded-xl p-6 shadow-md overflow-x-auto border border-[#e2e4e8]">
          <h2 className="text-lg font-semibold mb-4 text-[#1A2F50]">Продажи по диапазонам</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-[#1A2F50]/20">
                <th className="py-3 px-4 font-medium text-[#1A2F50]">Диапазон</th>
                <th className="py-3 px-4 font-medium text-[#1A2F50]">Выставлено</th>
                <th className="py-3 px-4 font-medium text-[#1A2F50]">Оплачено</th>
                <th className="py-3 px-4 font-medium text-[#1A2F50]">Конверсия</th>
                <th className="py-3 px-4 font-medium text-[#1A2F50]">Сумма оплат</th>
                <th className="py-3 px-4 font-medium text-[#1A2F50]">Ср. маржа</th>
                <th className="py-3 px-4 font-medium text-[#1A2F50]">Бюджет (сумма)</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr
                  key={b.bucket_id}
                  className="border-b border-[#e2e4e8] hover:bg-[#1A2F50]/5"
                >
                  <td className="py-2 px-4 text-[#1A2F50]">{b.label}</td>
                  <td className="py-2 px-4 text-[#1A2F50]">{formatNumber(b.issued_count_bucket)}</td>
                  <td className="py-2 px-4 text-[#1A2F50]">{formatNumber(b.paid_count_bucket)}</td>
                  <td className="py-2 px-4 text-[#E6004B] font-medium">{formatPercent(b.conversion_bucket)}</td>
                  <td className="py-2 px-4 text-[#1A2F50]">{formatNumber(b.paid_sum_bucket)} ₽</td>
                  <td className="py-2 px-4 text-[#1A2F50]">
                    {b.avg_margin_bucket != null ? formatMargin(b.avg_margin_bucket) : "—"}
                  </td>
                  <td className="py-2 px-4 text-[#1A2F50] font-medium">
                    {formatNumber(b.budget_sum_bucket ?? b.paid_sum_bucket)} ₽
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 5. Отменённые счета */}
        <section className="bg-white rounded-xl p-6 shadow-md border border-[#e2e4e8]">
          <h2 className="text-lg font-semibold mb-2 text-[#1A2F50]">Отменённые счета</h2>
          <p className="text-[#1A2F50]/70">
            Всего отменено: <strong>{formatNumber(cancelled.count)}</strong>
          </p>
        </section>

        {/* 6. О себе */}
        <section className="bg-white rounded-xl p-6 shadow-md border border-[#e2e4e8]">
          <h2 className="text-lg font-semibold mb-1 text-[#1A2F50]">О себе</h2>
          <p className="text-sm text-[#1A2F50]/60 mb-4">
            Напишите о сильных сторонах в работе, номенклатуре которую знаете, хобби, спорте и т.п.
          </p>
          <textarea
            value={aboutText}
            onChange={(e) => {
              setAboutText(e.target.value);
              setAboutError(null);
            }}
            rows={4}
            className="w-full px-4 py-3 border border-[#1A2F50]/20 rounded-lg bg-white text-[#1A2F50] placeholder:text-[#1A2F50]/50 focus:ring-2 focus:ring-[#E6004B]/40 focus:border-[#E6004B]"
            placeholder="Сильные стороны, номенклатура, хобби, спорт..."
          />
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSaveAbout}
              disabled={aboutSaving}
              className="px-6 py-2 bg-[#E6004B] text-white rounded-lg font-medium hover:bg-[#E6004B]/90 disabled:opacity-50 transition-colors"
            >
              {aboutSaving ? "Сохранение..." : "Сохранить"}
            </button>
            {aboutSaved && (
              <span className="text-[#1A2F50]/70 text-sm">
                Сохранено
              </span>
            )}
            {aboutError && (
              <span className="text-[#E6004B] text-sm">
                {aboutError}
              </span>
            )}
          </div>
        </section>

        {/* 7. Время обновления */}
        <section className="text-sm text-[#1A2F50]/60">
          Данные обновлены:{" "}
          {new Date(data.updated_at).toLocaleString("ru-RU", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </section>
      </div>
      </main>
    </div>
  );
}

function DashboardHeader() {
  return (
    <header className="bg-[#1A2F50] px-4 py-4 md:px-8 shadow-sm">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <img
            src="/sm-logo.png"
            alt="Space METALL"
            className="h-10 w-auto object-contain"
          />
        </a>
        <a
          href="/"
          className="text-white/80 text-sm hover:text-white transition-colors"
        >
          Выбор сотрудника
        </a>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col">
          <DashboardHeader />
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-lg text-[#1A2F50]/70">Загрузка...</div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
