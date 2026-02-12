"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface EmployeeItem {
  user_id: string;
  companies_count: number;
  league_name: string;
  league_color_hex: string;
  badge_image_path: string;
}

const DEFAULT_AVATARS: Record<string, string> = {
  "Ружников Дмитрий Константинович": "/avatars/ruznikov.png",
  "Кадыров Никита Дмитриевич": "/avatars/kadyrov.png",
  "Гнусарёв Евгений Андреевич": "/avatars/gnusarev.png",
};

function getAvatarUrl(emp: EmployeeItem): string | null {
  return DEFAULT_AVATARS[emp.user_id] ?? null;
}

export default function Home() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <h1 className="text-2xl font-semibold text-[#1A2F50] mb-2">
            Выберите сотрудника
          </h1>
          <p className="text-[#1A2F50]/70 mb-8">
            Выберите сотрудника для просмотра его метрик и дашборда.
          </p>

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {employees.map((emp) => {
                const avatarUrl = getAvatarUrl(emp);
                return (
                  <button
                    key={emp.user_id}
                    onClick={() => handleSelect(emp.user_id)}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white border-2 hover:scale-[1.02] transition-all text-left"
                    style={{
                      borderColor: emp.league_color_hex,
                      boxShadow: `0 0 14px ${emp.league_color_hex}55`,
                    }}
                  >
                    <div
                      className="relative w-16 h-16 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-[#1A2F50]/10"
                      style={{
                        border: `2px solid ${emp.league_color_hex}`,
                        boxShadow: `0 0 8px ${emp.league_color_hex}66`,
                      }}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-[#1A2F50]/40" style={{ color: emp.league_color_hex }}>
                          {emp.user_id.charAt(0)}
                        </span>
                      )}
                    </div>
                    <img
                      src={emp.badge_image_path}
                      alt={emp.league_name}
                      className="w-12 h-12 flex-shrink-0 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-[#1A2F50] block truncate">{emp.user_id}</span>
                      <span className="text-sm text-[#1A2F50]/60">
                        {emp.companies_count} связок · {emp.league_name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
