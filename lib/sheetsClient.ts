/**
 * Клиент для чтения сделок из Google Sheets для job ачивок.
 * Конфиг через env: SHEET_ID, RANGE, COLUMN_STATUS_NAME, COLUMN_DONE_DATE, COLUMN_MANAGER
 */

import type { DealRow } from "@/lib/types/achievements";

const DEFAULT_STATUS_COLUMN = "Имя статуса";
const DEFAULT_DATE_COLUMN = "Дата завершения";
const DEFAULT_MANAGER_COLUMN = "Ответственный";
const PAID_STATUS = "Успешно реализовано";

function getConfig() {
  const sheetId =
    process.env.SHEET_ID ??
    process.env.GOOGLE_SHEETS_SALES_FUNNEL_ID ??
    "1Ibc0FSJg3gFTfElZQ6jbAaU2-F7wf89Wf-gHp-klL58";
  const sheetName = process.env.SHEET_NAME ?? process.env.SALES_FUNNEL_SHEET_NAME ?? "Сделки";
  const rangeRaw = process.env.RANGE ?? "A:Z";
  const range = rangeRaw.includes("!") ? rangeRaw : `${sheetName}!${rangeRaw}`;
  const columnStatus = process.env.COLUMN_STATUS_NAME ?? DEFAULT_STATUS_COLUMN;
  const columnDate = process.env.COLUMN_DONE_DATE ?? DEFAULT_DATE_COLUMN;
  const columnManager = process.env.COLUMN_MANAGER ?? DEFAULT_MANAGER_COLUMN;
  return {
    sheetId,
    range,
    sheetName,
    columnStatus,
    columnDate,
    columnManager,
    paidStatus: PAID_STATUS,
  };
}

/** Найти индекс колонки по заголовку (с учётом вариантов написания) */
function findColumnIndex(headers: string[], variants: string[]): number {
  const normalized = headers.map((h) => String(h ?? "").toLowerCase().trim());
  const idx = normalized.findIndex((h) =>
    variants.some((v) =>
      h.includes(String(v).toLowerCase()) || String(v).toLowerCase().includes(h)
    )
  );
  return idx;
}

/**
 * Нормализация даты из Google Sheets в YYYY-MM.
 * Поддерживает: DD.MM.YYYY, YYYY-MM-DD, Excel serial, timestamp.
 */
export function normalizeDateToMonthKey(raw: string | undefined): string | null {
  if (!raw || !String(raw).trim()) return null;
  const s = String(raw).trim();

  // DD.MM.YYYY или DD/MM/YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (ddmmyyyy) {
    const [, , month, year] = ddmmyyyy;
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  // YYYY-MM-DD или ISO
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const [, year, month] = iso;
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  // Excel serial number
  const excelSerial = parseFloat(s);
  if (!Number.isNaN(excelSerial) && excelSerial > 0) {
    const date = excelDateToJS(excelSerial);
    if (date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
  }

  // new Date() fallback
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Excel serial date (days since 1900-01-01) в JS Date */
function excelDateToJS(serial: number): Date | null {
  const epoch = new Date(1899, 11, 30);
  const ms = serial * 24 * 60 * 60 * 1000;
  const d = new Date(epoch.getTime() + ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Читает сырые строки из Google Sheets */
async function fetchSheetRows(sheetId: string, range: string): Promise<string[][]> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is required for sheetsClient");
  }
  const credentials = JSON.parse(serviceAccountJson);
  const { google } = await import("googleapis");
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });
  return (res.data.values ?? []) as string[][];
}

/**
 * Читает сделки из Google Sheets, возвращает все строки (без фильтрации по статусу).
 * Фильтрация выполняется в achievementsJob.
 */
export async function fetchDealsFromSheet(): Promise<{
  rows: DealRow[];
  totalRead: number;
  headers: string[];
}> {
  const { sheetId, range, columnStatus, columnDate, columnManager } = getConfig();
  const raw = await fetchSheetRows(sheetId, range);

  if (raw.length === 0) {
    return { rows: [], totalRead: 0, headers: [] };
  }

  const headers = (raw[0] ?? []).map((h) => String(h ?? "").trim());
  const dataRows = raw.slice(1);

  const statusIdx = findColumnIndex(headers, [
    columnStatus,
    "статус сделки",
    "status",
    "имя статуса",
  ]);
  const dateIdx = findColumnIndex(headers, [
    columnDate,
    "дата завершения",
    "paid_date",
    "дата_оплаты",
  ]);
  const managerIdx = findColumnIndex(headers, [
    columnManager,
    "менеджер",
    "ответственный",
    "имя ответственного",
    "user_id",
  ]);

  const rows: DealRow[] = [];
  for (const row of dataRows) {
    const userId = managerIdx >= 0 ? String(row[managerIdx] ?? "").trim() : "";
    const status = statusIdx >= 0 ? String(row[statusIdx] ?? "").trim() : "";
    const completionDate = dateIdx >= 0 ? (row[dateIdx] as string | undefined) : undefined;
    rows.push({ userId, status, completionDate });
  }

  return {
    rows,
    totalRead: dataRows.length,
    headers,
  };
}

export { getConfig, PAID_STATUS };
