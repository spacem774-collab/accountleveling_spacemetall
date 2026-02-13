"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LEAGUES } from "@/config/league";
import { HARD_SKILLS_RANKS } from "@/config/hardSkills";

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
  return DEFAULT_AVATARS[emp.user_id] ?? null;
}

function getStartDate(emp: EmployeeItem): string | null {
  return START_DATES[emp.user_id] ?? null;
}

export default function Home() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

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
      })
      .catch((err) => {
        const msg = err.name === "AbortError" ? "Загрузка заняла слишком много времени. Повторите попытку." : (err.message ?? "Ошибка загрузки");
        setError(msg);
        setEmployees([]);
      })
      .finally(() => { clearTimeout(t); setLoading(false); });
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSelect = (userId: string) => {
    router.push(`/dashboard?user_id=${encodeURIComponent(userId)}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f6f8]">
      <header className="bg-[#1A2F50] px-4 py-4 md:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center">
          <Image
            src="/sm-logo.png"
            alt="Space METALL"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
          />
        </div>
      </header>
      <main className="flex-1 py-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-[#1A2F50] mb-2">
                Выберите сотрудника
              </h1>
              <p className="text-[#1A2F50]/70">
                Выберите сотрудника для просмотра его метрик и дашборда.
              </p>
            </div>
            <button
              onClick={() => setRulesOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#1A2F50] text-[#1A2F50] font-medium hover:bg-[#1A2F50]/5 transition-colors shadow-[0_0_6px_rgba(26,47,80,0.15)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Условия лиг и рангов
            </button>
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
        </div>
      </main>
    </div>
  );
}
