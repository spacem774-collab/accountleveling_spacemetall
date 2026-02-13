"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LEAGUES } from "@/config/league";
import { HARD_SKILLS_RANKS } from "@/config/hardSkills";
import { getDepartmentPlan } from "@/config/plans";
import MatcastModal from "@/app/components/MatcastModal";

function formatMargin(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} млн ₽`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс ₽`;
  return `${n.toLocaleString("ru-RU")} ₽`;
}

interface EmployeeItem {
  user_id: string;
  companies_count: number;
  league_name: string;
  league_color_hex: string;
  badge_image_path: string;
  total_margin: number;
  conversion_percent: number;
  issued_count: number;
  paid_count: number;
  hard_skills: { emoji: string; letter: string; name: string };
  total_achievements?: number;
  contacts?: { phone?: string; email?: string; telegram?: string; instagram?: string };
}

const DEFAULT_AVATARS: Record<string, string> = {
  "Ружников Дмитрий Константинович": "/avatars/ruznikov.png",
  "Кадыров Никита Дмитриевич": "/avatars/kadyrov.png",
  "Гнусарёв Евгений Андреевич": "/avatars/gnusarev.png",
};

/** Дата выхода в компанию (отображение) */
const START_DATES: Record<string, string> = {
  "Кадыров Никита Дмитриевич": "15 декабря 2025",
  "Ружников Дмитрий Константинович": "04 сентября 2025",
  "Гнусарёв Евгений Андреевич": "03 февраля 2026",
};

function getAvatarUrl(emp: EmployeeItem): string | null {
  const exact = DEFAULT_AVATARS[emp.user_id];
  if (exact) return exact;
  const key = Object.keys(DEFAULT_AVATARS).find(
    (k) => k && emp.user_id && (emp.user_id.includes(k.trim()) || k.trim().includes(emp.user_id))
  );
  return key ? DEFAULT_AVATARS[key] ?? null : null;
}

function getAvatarForUserId(userId: string): string | null {
  const exact = DEFAULT_AVATARS[userId];
  if (exact) return exact;
  const key = Object.keys(DEFAULT_AVATARS).find(
    (k) => k && userId && (userId.includes(k.trim()) || k.trim().includes(userId))
  );
  return key ? DEFAULT_AVATARS[key] ?? null : null;
}

function getStartDate(emp: EmployeeItem): string | null {
  return START_DATES[emp.user_id] ?? null;
}

const PREV_MONTH_NAMES = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

function getPrevMonthLabel(): string {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return `${PREV_MONTH_NAMES[prevMonth]} ${prevYear}`;
}

export default function Home() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [attestationOpen, setAttestationOpen] = useState(false);
  const [matcastOpen, setMatcastOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [totalCurrentMonthMargin, setTotalCurrentMonthMargin] = useState<number>(0);
  const [totalCurrentMonthBudget, setTotalCurrentMonthBudget] = useState<number>(0);
  const [totalPreviousMonthMargin, setTotalPreviousMonthMargin] = useState<number>(0);
  const [departmentPlan, setDepartmentPlan] = useState<number>(0);
  const [bestPrevMonthEmployee, setBestPrevMonthEmployee] = useState<{ user_id: string; margin: number; consecutive_months?: number } | null>(null);
  const [bestYearEmployee, setBestYearEmployee] = useState<{ user_id: string; margin: number } | null>(null);

  const loadEmployees = () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 45000);
    fetch("/api/employees", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Ошибка загрузки");
        return res.json();
      })
      .then((data) => {
        const list = data.employees ?? [];
        if (Array.isArray(list)) {
          setEmployees(list);
        } else {
          setEmployees([]);
        }
        setTotalCurrentMonthMargin(typeof data.total_current_month_margin === "number" ? data.total_current_month_margin : 0);
        setTotalCurrentMonthBudget(typeof data.total_current_month_budget === "number" ? data.total_current_month_budget : 0);
        setTotalPreviousMonthMargin(typeof data.total_previous_month_margin === "number" ? data.total_previous_month_margin : 0);
        setDepartmentPlan(typeof data.department_plan === "number" ? data.department_plan : 0);
        setBestPrevMonthEmployee(
          data.best_prev_month_employee && typeof data.best_prev_month_employee.user_id === "string"
            ? data.best_prev_month_employee
            : null
        );
        setBestYearEmployee(
          data.best_year_employee && typeof data.best_year_employee.user_id === "string"
            ? data.best_year_employee
            : null
        );
      })
      .catch((err) => {
        const msg = err.name === "AbortError" ? "Загрузка заняла слишком много времени. Повторите попытку." : (err.message ?? "Ошибка загрузки");
        setError(msg);
        setEmployees([]);
        setTotalCurrentMonthMargin(0);
        setTotalCurrentMonthBudget(0);
        setTotalPreviousMonthMargin(0);
        setDepartmentPlan(0);
        setBestPrevMonthEmployee(null);
        setBestYearEmployee(null);
      })
      .finally(() => { clearTimeout(t); setLoading(false); });
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const [chelyabinskTime, setChelyabinskTime] = useState("");
  useEffect(() => {
    const format = () => {
      const now = new Date();
      setChelyabinskTime(
        now.toLocaleString("ru-RU", {
          timeZone: "Asia/Yekaterinburg",
          dateStyle: "medium",
          timeStyle: "medium",
        })
      );
    };
    format();
    const t = setInterval(format, 1000);
    return () => clearInterval(t);
  }, []);

  const handleSelect = (userId: string) => {
    router.push(`/dashboard?user_id=${encodeURIComponent(userId)}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
      <header className="bg-[#1A2F50] px-4 py-4 md:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Image
            src="/sm-logo.png"
            alt="Space METALL"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
          />
          {chelyabinskTime && (
            <div className="text-white/90 text-sm font-medium">
              Челябинск: {chelyabinskTime}
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 py-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6 mb-8 max-w-2xl">
            <div>
              <h1 className="text-2xl font-semibold text-[#1A2F50] mb-2">
                Выберите сотрудника
              </h1>
              <p className="text-[#1A2F50]/70">
                Выберите сотрудника для просмотра его метрик и дашборда.
              </p>
              {!loading && !error && (
                <div className="mt-3 space-y-3 w-full">
                  <div className="flex flex-wrap gap-3 w-full">
                    <div className="flex-1 min-w-[200px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#e2e4e8] shadow-[0_0_6px_rgba(26,47,80,0.08)]">
                      <span className="text-sm text-[#1A2F50]/70">Маржа за этот месяц:</span>
                      <span className="font-bold text-[#1A2F50]">{formatMargin(totalCurrentMonthMargin)}</span>
                    </div>
                    <div className="flex-1 min-w-[200px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#e2e4e8] shadow-[0_0_6px_rgba(26,47,80,0.08)]">
                      <span className="text-sm text-[#1A2F50]/70">Маржа за прошлый месяц:</span>
                      <span className="font-bold text-[#1A2F50]">{formatMargin(totalPreviousMonthMargin)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-stretch gap-4 w-full">
                    <div className="flex-1 min-w-0 bg-white rounded-lg border border-[#e2e4e8] p-4 shadow-[0_0_6px_rgba(26,47,80,0.08)]">
                      <div className="flex items-center justify-between text-sm text-[#1A2F50]/70 mb-2">
                        <span>План отдела на месяц</span>
                        <span className="font-medium text-[#1A2F50]">
                          {(() => {
                            const plan = departmentPlan || getDepartmentPlan(employees.map((e) => e.user_id));
                            return plan > 0
                              ? `${formatMargin(totalCurrentMonthBudget)} / ${formatMargin(plan)}`
                              : `${formatMargin(totalCurrentMonthBudget)} ₽ (план не задан)`;
                          })()}
                        </span>
                      </div>
                      {(() => {
                        const plan = departmentPlan || getDepartmentPlan(employees.map((e) => e.user_id));
                        return plan > 0 ? (
                          <>
                            <div className="h-5 w-full rounded-full bg-[#1A2F50]/10 overflow-hidden shadow-inner">
                              <div
                                className="h-full rounded-full bg-[#E6004B] transition-all duration-500 ease-out"
                                style={{
                                  width: `${Math.min(100, (totalCurrentMonthBudget / plan) * 100)}%`,
                                }}
                              />
                            </div>
                            {totalCurrentMonthBudget < plan && (
                              <p className="text-xs text-[#1A2F50]/60 mt-1.5">
                                Осталось: {formatMargin(plan - totalCurrentMonthBudget)}
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="h-5 w-full rounded-full bg-[#1A2F50]/10 overflow-hidden shadow-inner" title="Задайте планы в config/plans.ts" />
                        );
                      })()}
                    </div>
                    {bestYearEmployee && (
                      <button
                        onClick={() => handleSelect(bestYearEmployee.user_id)}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white border-2 border-[#E6004B]/30 hover:border-[#E6004B]/60 hover:shadow-lg transition-all text-center min-w-[120px] self-stretch"
                        title={`Лучший по марже в ${new Date().getFullYear()} г. — ${bestYearEmployee.user_id}`}
                      >
                        <div className="relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-[#1A2F50]/10 border-2 border-[#E6004B]/40">
                          {(getAvatarForUserId(bestYearEmployee.user_id) ?? null) ? (
                            <img
                              src={getAvatarForUserId(bestYearEmployee.user_id)!}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-bold text-[#1A2F50]/70">
                              {bestYearEmployee.user_id.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-[#1A2F50]/80">
                          Лучший по марже {new Date().getFullYear()} г.
                        </span>
                        <span className="text-sm font-bold text-[#E6004B]">{formatMargin(bestYearEmployee.margin)}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 w-full">
              <div className="relative flex-1 min-w-[200px]">
                <button
                  onClick={() => setChannelsOpen((v) => !v)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-[#0088cc]/60 bg-[#0088cc]/5 text-[#0088cc] font-medium hover:bg-[#0088cc]/10 transition-colors shadow-[0_0_6px_rgba(0,136,204,0.15)]"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  <span>Каналы</span>
                  <svg className={`w-4 h-4 transition-transform ${channelsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {channelsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setChannelsOpen(false)} aria-hidden />
                    <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-white rounded-lg border-2 border-[#0088cc]/30 shadow-xl z-50">
                      <a
                        href="https://t.me/+dJEMOEdZchRhNDVi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 text-left text-[#1A2F50] hover:bg-[#0088cc]/10 transition-colors"
                        onClick={() => setChannelsOpen(false)}
                      >
                        <span>История нашей компании</span>
                        <svg className="w-4 h-4 ml-auto text-[#0088cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <a
                        href="https://t.me/+Aq13Cs45eS85MTky"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 text-left text-[#1A2F50] hover:bg-[#0088cc]/10 transition-colors"
                        onClick={() => setChannelsOpen(false)}
                      >
                        <span>Канал для сотрудников</span>
                        <svg className="w-4 h-4 ml-auto text-[#0088cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setMatcastOpen(true)}
                className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-[#1A2F50] text-[#1A2F50] font-medium hover:bg-[#1A2F50]/5 transition-colors shadow-[0_0_6px_rgba(26,47,80,0.15)]"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Матчасть</span>
              </button>
              <button
                onClick={() => setRulesOpen(true)}
                className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-[#1A2F50] text-[#1A2F50] font-medium hover:bg-[#1A2F50]/5 transition-colors shadow-[0_0_6px_rgba(26,47,80,0.15)]"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Таблица рангов</span>
              </button>
              <button
                onClick={() => setAttestationOpen(true)}
                className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-[#1A2F50] text-[#1A2F50] font-medium hover:bg-[#1A2F50]/5 transition-colors shadow-[0_0_6px_rgba(26,47,80,0.15)]"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span>Блок аттестации</span>
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-[#1A2F50]/70 py-12 text-center">
              Загрузка списка...
            </div>
          )}

          {error && (
            <div className="bg-white p-6 rounded-xl border border-[#e2e4e8]">
              <p className="text-[#E6004B] mb-3">{error}</p>
              <button
                onClick={() => { setError(null); loadEmployees(); }}
                className="px-4 py-2 bg-[#E6004B] text-white rounded-lg font-medium hover:bg-[#E6004B]/90 transition-colors"
              >
                Повторить
              </button>
            </div>
          )}

          {!loading && !error && employees.length === 0 && (
            <div className="bg-white p-6 rounded-xl border border-[#e2e4e8] text-[#1A2F50]/70">
              Сотрудники не найдены. Проверьте подключение к данным.
            </div>
          )}

          {bestPrevMonthEmployee && !loading && !error && (
            <button
              onClick={() => handleSelect(bestPrevMonthEmployee.user_id)}
              className="mb-6 flex items-center gap-5 p-5 rounded-xl bg-gradient-to-r from-[#1A2F50]/10 to-[#E6004B]/10 border-2 border-[#E6004B]/30 hover:border-[#E6004B]/50 hover:scale-[1.01] transition-all text-left w-full max-w-2xl shadow-[0_0_16px_rgba(230,0,75,0.2)]"
            >
              <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl" aria-hidden>🏆</span>
                  {(bestPrevMonthEmployee.consecutive_months ?? 1) > 1 && (
                    <span className="text-sm font-bold text-[#E6004B] align-top">×{bestPrevMonthEmployee.consecutive_months}</span>
                  )}
                </div>
                <span className="text-xs font-medium text-[#1A2F50]/70 uppercase tracking-wider">Лучший</span>
              </div>
              <div className="relative w-16 h-16 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-white border-2 border-[#E6004B]/40 shadow-lg">
                {(getAvatarForUserId(bestPrevMonthEmployee.user_id) ?? null) ? (
                  <img
                    src={getAvatarForUserId(bestPrevMonthEmployee.user_id)!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-[#1A2F50]/70">
                    {bestPrevMonthEmployee.user_id.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#1A2F50]/60 mb-0.5">
                  Лучший сотрудник {getPrevMonthLabel()} по марже
                  {(bestPrevMonthEmployee.consecutive_months ?? 1) > 1 && (
                    <span className="ml-1 font-medium text-[#E6004B]">
                      ({bestPrevMonthEmployee.consecutive_months} мес. подряд)
                    </span>
                  )}
                </p>
                <p className="font-bold text-lg text-[#1A2F50] truncate">{bestPrevMonthEmployee.user_id}</p>
                <p className="text-[#E6004B] font-semibold mt-0.5">{formatMargin(bestPrevMonthEmployee.margin)}</p>
              </div>
              <svg className="w-6 h-6 text-[#1A2F50]/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {!loading && !error && employees.length > 0 && (
            <div className="grid grid-cols-1 gap-4 max-w-2xl">
              {employees.map((emp, index) => {
                const place = index + 1;
                const avatarUrl = getAvatarUrl(emp);
                const marginFormatted = emp.total_margin >= 1_000_000
                  ? `${(emp.total_margin / 1_000_000).toFixed(1)} млн ₽`
                  : emp.total_margin >= 1_000
                    ? `${(emp.total_margin / 1_000).toFixed(1)} тыс ₽`
                    : `${emp.total_margin.toLocaleString("ru-RU")} ₽`;
                return (
                  <button
                    key={emp.user_id}
                    onClick={() => handleSelect(emp.user_id)}
                    className="flex items-center gap-4 p-5 rounded-xl bg-white border-2 border-[#1A2F50] hover:scale-[1.01] transition-all text-left w-full shadow-[0_0_12px_rgba(26,47,80,0.2),0_0_6px_rgba(230,0,75,0.15)]"
                  >
                    <span className="flex-shrink-0 w-8 text-center text-[#1A2F50]/60 font-medium tabular-nums">
                      {place}
                    </span>
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-[#1A2F50]/10 border-2 border-[#1A2F50] shadow-[0_0_6px_rgba(26,47,80,0.2),0_0_3px_rgba(230,0,75,0.15)]">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-[#1A2F50]/70">
                          {emp.user_id.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-lg text-[#1A2F50] block truncate">
                        {emp.user_id}
                      </span>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-[#1A2F50]/70">
                        <span>{emp.companies_count} связок</span>
                        <span>·</span>
                        <span title="Общая маржа">{marginFormatted}</span>
                        <span>·</span>
                        <span title="Конверсия">{emp.conversion_percent.toFixed(1)}%</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {getStartDate(emp) && (
                          <div
                            className="inline-flex items-center px-3 py-1.5 rounded-lg border-2 border-[#1A2F50] text-sm font-medium text-[#1A2F50] shadow-[0_0_6px_rgba(26,47,80,0.2),0_0_3px_rgba(230,0,75,0.15)]"
                            title="Дата выхода в компанию"
                          >
                            {getStartDate(emp)}
                          </div>
                        )}
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#1A2F50] text-sm font-medium text-[#1A2F50] shadow-[0_0_6px_rgba(26,47,80,0.2),0_0_3px_rgba(230,0,75,0.15)]"
                          title="Общее количество наград"
                        >
                          {emp.total_achievements ?? 0}
                          <span className="text-[#E6004B]" aria-hidden>★</span>
                        </div>
                      </div>
                      {(emp.contacts && (emp.contacts.phone || emp.contacts.email || emp.contacts.telegram || emp.contacts.instagram)) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {emp.contacts.phone && (
                            <a href={`tel:${emp.contacts.phone.replace(/\D/g, "")}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[#1A2F50]/80 hover:text-[#E6004B] transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              {emp.contacts.phone}
                            </a>
                          )}
                          {emp.contacts.email && (
                            <a href={`mailto:${emp.contacts.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[#1A2F50]/80 hover:text-[#E6004B] transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              {emp.contacts.email}
                            </a>
                          )}
                          {emp.contacts.telegram && (
                            <a href={`https://t.me/${emp.contacts.telegram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[#1A2F50]/80 hover:text-[#0088cc] transition-colors" title="Telegram">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                              {emp.contacts.telegram}
                            </a>
                          )}
                          {emp.contacts.instagram && (
                            <a href={`https://instagram.com/${emp.contacts.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[#1A2F50]/80 hover:text-[#E4405F] transition-colors" title="Instagram">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                              @{emp.contacts.instagram.replace(/^@/, "")}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <img
                        src={emp.badge_image_path}
                        alt={emp.league_name}
                        className="w-12 h-12 object-contain"
                        title={emp.league_name}
                      />
                      <div className="text-right">
                        <div className="text-xs text-[#1A2F50]/60 uppercase tracking-wide mb-0.5">
                          Hard Skills
                        </div>
                        <div className="font-bold text-[#1A2F50]">
                          {emp.hard_skills.letter} — {emp.hard_skills.name}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Модальное окно условий */}
          {rulesOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setRulesOpen(false)}
            >
              <div
                className="bg-white rounded-xl border-2 border-[#1A2F50] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-[#e2e4e8] px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[#1A2F50]">
                    Условия лиг и рангов
                  </h2>
                  <button
                    onClick={() => setRulesOpen(false)}
                    className="p-2 rounded-lg text-[#1A2F50]/70 hover:bg-[#1A2F50]/10 transition-colors"
                    aria-label="Закрыть"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-8">
                  <section>
                    <h3 className="text-lg font-semibold text-[#1A2F50] mb-3 flex items-center gap-2">
                      <img src="/badges/bronze.png" alt="" className="w-6 h-6 object-contain" />
                      Лиги (по количеству связок)
                    </h3>
                    <ul className="space-y-2 text-[#1A2F50]/90">
                      {LEAGUES.map((l) => (
                        <li
                          key={l.id}
                          className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#1A2F50]/5 border border-[#1A2F50]/20"
                        >
                          <img src={l.badge_image_path} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                          <span className="font-medium">{l.name}</span>
                          <span className="text-sm text-[#1A2F50]/70 ml-auto">
                            {l.max === Infinity ? `${l.min}+ связок` : `${l.min} – ${l.max} связок`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3 className="text-lg font-semibold text-[#1A2F50] mb-3">
                      Hard Skills (маржа + конверсия + оплаченные счета)
                    </h3>
                    <p className="text-sm text-[#1A2F50]/70 mb-3">
                      Ранг определяется по наивысшему уровню, где выполнены все минимальные пороги.
                    </p>
                    <ul className="space-y-3">
                      {[...HARD_SKILLS_RANKS].reverse().map((r) => (
                        <li
                          key={r.id}
                          className="py-3 px-4 rounded-lg bg-[#1A2F50]/5 border border-[#1A2F50]/20"
                        >
                          <div className="flex items-center gap-2 font-semibold text-[#1A2F50] mb-1">
                            <span>{r.emoji}</span>
                            <span>{r.letter} — {r.name}</span>
                          </div>
                          <ul className="text-sm text-[#1A2F50]/80 space-y-0.5">
                            <li>• Маржа: от {formatMargin(r.marginMin)}</li>
                            <li>• Конверсия: от {r.conversionMin}%</li>
                            <li>• Оплаченные счета: от {r.paidCountMin}</li>
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* Модальное окно матчасти */}
          {matcastOpen && <MatcastModal onClose={() => setMatcastOpen(false)} />}

          {/* Модальное окно аттестации */}
          {attestationOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setAttestationOpen(false)}
            >
              <div
                className="bg-white rounded-xl border-2 border-[#1A2F50] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-[#e2e4e8] px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[#1A2F50]">
                    Аттестация сотрудника
                  </h2>
                  <button
                    onClick={() => setAttestationOpen(false)}
                    className="p-2 rounded-lg text-[#1A2F50]/70 hover:bg-[#1A2F50]/10 transition-colors"
                    aria-label="Закрыть"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                  <p className="text-[#1A2F50]/70 text-center mb-6">
                    Выберите лигу для прохождения аттестации и перехода на следующий уровень
                  </p>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1A2F50]/60 text-center mb-4">
                    Выбор аттестации
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a
                      href="/attestation-silver.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col rounded-xl border-2 border-[#C0C0C0] bg-[#1A2F50]/5 overflow-hidden no-underline text-inherit hover:shadow-lg hover:border-[#C0C0C0]/80 hover:-translate-y-0.5 transition-all"
                    >
                      <div className="aspect-square p-6 flex items-center justify-center bg-gradient-to-b from-white/10 to-transparent">
                        <img src="/badges/silver.png" alt="Silver лига" className="w-full max-w-[140px] h-auto object-contain" />
                      </div>
                      <div className="p-4 text-center border-t border-[#1A2F50]/20">
                        <div className="font-bold text-lg text-[#6B7280] mb-1">Переход в Silver лигу</div>
                        <p className="text-sm text-[#1A2F50]/70">Аттестация для перехода в Silver лигу</p>
                      </div>
                    </a>
                    <a
                      href="/attestation-gold.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col rounded-xl border-2 border-[#D4AF37] bg-[#1A2F50]/5 overflow-hidden no-underline text-inherit hover:shadow-lg hover:border-[#D4AF37]/80 hover:-translate-y-0.5 transition-all"
                    >
                      <div className="aspect-square p-6 flex items-center justify-center bg-gradient-to-b from-white/10 to-transparent">
                        <img src="/badges/gold.png" alt="Gold лига" className="w-full max-w-[140px] h-auto object-contain" />
                      </div>
                      <div className="p-4 text-center border-t border-[#1A2F50]/20">
                        <div className="font-bold text-lg text-[#B8860B] mb-1">Переход в Gold лигу</div>
                        <p className="text-sm text-[#1A2F50]/70">Аттестация для перехода в Gold лигу</p>
                      </div>
                    </a>
                  </div>
                  <p className="text-center text-sm text-[#1A2F50]/60 mt-6 pt-4 border-t border-[#e2e4e8]">
                    SpaceMETALL — внутренняя аттестация сотрудников
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
