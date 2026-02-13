/**
 * Контактные данные сотрудников.
 * Добавьте или измените данные по user_id (ФИО).
 */

export interface EmployeeContacts {
  phone?: string;
  email?: string;
  telegram?: string;
  instagram?: string;
}

/** Ключ — user_id (ФИО), совпадает с Companies/Invoices */
export const EMPLOYEE_CONTACTS: Record<string, EmployeeContacts> = {
  "Ружников Дмитрий Константинович": {
    phone: "89995861350",
    email: "103@spacemetall.ru",
    telegram: "@ruzh13",
    instagram: "ruzhnikovdmitry",
  },
  "Кадыров Никита Дмитриевич": {
    phone: "89088289872",
    email: "105@spacemetall.ru",
    telegram: "@Pandos_95",
    instagram: "Pandos_95",
  },
  "Гнусарёв Евгений Андреевич": {
    phone: "89049349079",
    email: "102@spacemetall.ru",
    telegram: "@Evgeniy_savage",
    instagram: "gnusarev96",
  },
};

/** Контакты по user_id с поддержкой частичного совпадения (как в avatar/startDate) */
export function getContacts(userId: string): EmployeeContacts | null {
  const exact = EMPLOYEE_CONTACTS[userId];
  if (exact) return exact;
  const key = Object.keys(EMPLOYEE_CONTACTS).find(
    (k) => k && userId && (userId.includes(k.trim()) || k.trim().includes(userId))
  );
  return key ? EMPLOYEE_CONTACTS[key] ?? null : null;
}
