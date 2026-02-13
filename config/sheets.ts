/**
 * Конфигурация источников данных
 *
 * Воронка продаж: 1Ibc0FSJg3gFTfElZQ6jbAaU2-F7wf89Wf-gHp-klL58
 * Лист «Все сделки из воронки продаж» — все сделки для метрик и ачивок.
 * Ачивки: фильтр «Имя статуса» = «Успешно реализовано», месяц из «Дата завершения».
 */

/** ID таблицы "Воронка продаж" */
export const SALES_FUNNEL_SPREADSHEET_ID = "1Ibc0FSJg3gFTfElZQ6jbAaU2-F7wf89Wf-gHp-klL58";

/** Лист «Все сделки из воронки продаж» — источник для метрик и ачивок */
export const SALES_FUNNEL_DEFAULT_SHEET = "Все сделки из воронки продаж";
/** Альтернативные названия листа (fallback при отсутствии основного) */
export const SALES_FUNNEL_SHEET_ALIASES = ["Все сделки из воронки продаж", "Все сделки", "Сделки"] as const;

/** ID таблицы "Количество связок" */
export const CONNECTIONS_SPREADSHEET_ID = "1eUmK264I8OMDs69FlIuDiGXkE9B4gO2FnywxiWNnoDo";

/** Статус сделки = «Успешно реализовано» (из столбца «Имя статуса») */
export const PAID_DEAL_STATUSES = ["Успешно реализовано"] as const;

/** Варианты названий колонок для воронки (регистр не учитывается) */
export const SALES_FUNNEL_COLUMNS = {
  user_id: ["имя ответственного", "user_id", "userid", "user", "id пользователя", "пользователь", "ответственный"],
  /** Номер счета — если заполнен, счет выставлен */
  invoice_number: ["номер счета", "номер счёта", "invoice_id", "invoiceid", "id счета", "счет"],
  /** Сумма продажи — для диапазона, суммы оплат (важно: не путать с «сумма закупки») */
  sales_amount: ["сумма продажи", "sales_amount", "amount", "invoice_amount"],
  /** Бюджет — сумма продаж для оплаченных */
  budget: ["бюджет сделки", "бюджет", "budget", "бюджет_руб"],
  /** Сумма закупки — для расчёта маржи */
  purchase_amount: ["сумма закупки", "purchase_amount", "cost", "себестоимость"],
  /** Статус сделки / Имя статуса — "Успешно реализовано" = оплачено. Без "ид статуса"! */
  status_name: ["имя статуса", "статус сделки", "status"],
  date: ["date", "invoice_date", "дата", "created_at"],
  paid_date: ["paid_date", "дата_оплаты", "дата завершения", "paid_date"],
} as const;

/** Варианты названий колонок для связок */
export const CONNECTIONS_COLUMNS = {
  user_id: ["имя ответственного", "user_id", "userid", "user", "ответственный", "менеджер", "владелец", "id пользователя", "пользователь", "сотрудник"],
  company_id: ["company_id", "companyid", "company", "id компании", "компания", "id"],
  company_name: ["название компании", "company_name", "companyname", "компания", "организация"],
  contact_name: ["имена контактов", "contact_name", "contactname", "контакт", "contact", "контактное лицо", "фио"],
  created_at: ["created_at", "createdat", "дата", "дата создания"],
} as const;

/** Найти индекс колонки по заголовкам. variants — массив возможных названий колонки */
export function findColumnIndex(
  headers: string[],
  variants: readonly string[]
): number {
  const normalized = headers.map((h) => String(h ?? "").toLowerCase().trim());
  const idx = normalized.findIndex((h) =>
    variants.some((n) =>
      h.includes(String(n).toLowerCase()) || String(n).toLowerCase().includes(h)
    )
  );
  return idx;
}
