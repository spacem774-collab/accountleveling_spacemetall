"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getNextLeague, getProgressToNextLeague } from "@/config/league";
import { getMonthlyPlan } from "@/config/plans";
import { getContacts } from "@/config/contacts";
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
            {(() => {
              const contacts = getContacts(data.user_id);
              if (!contacts || (!contacts.phone && !contacts.email && !contacts.telegram && !contacts.instagram)) return null;
              return (
                <div className="mt-4 pt-4 border-t border-[#1A2F50]/20">
                  <p className="text-xs font-medium text-[#1A2F50]/60 mb-2">Контакты</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {contacts.phone && (
                      <a href={`tel:${contacts.phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1.5 text-[#1A2F50] hover:text-[#E6004B] transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        {contacts.phone}
                      </a>
                    )}
                    {contacts.email && (
                      <a href={`mailto:${contacts.email}`} className="inline-flex items-center gap-1.5 text-[#1A2F50] hover:text-[#E6004B] transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {contacts.email}
                      </a>
                    )}
                    {contacts.telegram && (
                      <a href={`https://t.me/${contacts.telegram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#1A2F50] hover:text-[#0088cc] transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        {contacts.telegram}
                      </a>
                    )}
                    {contacts.instagram && (
                      <a href={`https://instagram.com/${contacts.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#1A2F50] hover:text-[#E4405F] transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        @{contacts.instagram.replace(/^@/, "")}
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}
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
