import type { CompanyRow, InvoiceRow } from "@/lib/metrics";
import {
  mockCompanies,
  mockInvoices,
  getMockAbout,
  setMockAbout,
} from "@/__mocks__/data";
import {
  SALES_FUNNEL_SPREADSHEET_ID,
  CONNECTIONS_SPREADSHEET_ID,
  SALES_FUNNEL_COLUMNS,
  CONNECTIONS_COLUMNS,
  findColumnIndex,
} from "@/config/sheets";

export interface AboutRow {
  user_id: string;
  about_text: string;
  updated_at: string;
  avatar_url?: string;
}

/** Кэш данных из таблиц. 30 сек — чтобы совпадало с обновлением дашборда */
const CACHE_TTL_MS = 30 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const aboutCache = new Map<string, CacheEntry<AboutRow | null>>();

function getAboutFromCache(userId: string): AboutRow | null | undefined {
  const entry = aboutCache.get(`about_${userId}`);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    aboutCache.delete(`about_${userId}`);
    return undefined;
  }
  return entry.data;
}

function setAboutCache(userId: string, data: AboutRow | null, ttlMs: number = CACHE_TTL_MS): void {
  aboutCache.set(`about_${userId}`, { data, expiresAt: Date.now() + ttlMs });
}

function parseCompanyRow(row: string[]): CompanyRow {
  return {
    user_id: row[0] ?? "",
    company_id: row[1] ?? "",
    company_name: row[2] ?? "",
    contact_name: row[3] ?? "",
    created_at: row[4] ?? "",
  };
}

/** Парсит число из "р.44 500,00", "руб. 1 234,56" и подобных форматов */
function parseAmount(val: string | undefined): number {
  if (val == null || String(val).trim() === "") return 0;
  const s = String(val)
    .replace(/р\.?|руб\.?/gi, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".");
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

function parseInvoiceRow(
  row: string[],
  headerIndices?: {
    user_id: number;
    invoice_number: number;
    sales_amount: number;
    date: number;
    status_name: number;
    paid_date: number;
    budget: number;
    purchase_amount: number;
  }
): InvoiceRow {
  const idx = (i: number | undefined, def: number) => (i != null && i >= 0 ? i : def);
  const userIdx = idx(headerIndices?.user_id, 0);
  const invIdx = idx(headerIndices?.invoice_number, 1);
  const amtIdx = idx(headerIndices?.sales_amount, 2);
  const dateIdx = idx(headerIndices?.date, 3);
  const statusIdx = idx(headerIndices?.status_name, 4);
  const paidIdx = idx(headerIndices?.paid_date, 5);
  const budgetIdx = headerIndices?.budget ?? -1;
  const purchaseIdx = headerIndices?.purchase_amount ?? -1;

  const amount = parseAmount(row[amtIdx]);
  const hasBudget = budgetIdx >= 0 && row[budgetIdx] != null && String(row[budgetIdx]).trim() !== "";
  const budgetVal = hasBudget ? parseAmount(row[budgetIdx]) : undefined;
  const purchaseVal =
    purchaseIdx >= 0 && row[purchaseIdx] != null && String(row[purchaseIdx]).trim() !== ""
      ? parseAmount(row[purchaseIdx])
      : undefined;

  return {
    user_id: String(row[userIdx] ?? "").trim(),
    invoice_id: String(row[invIdx] ?? "").trim(),
    invoice_amount: amount,
    invoice_date: row[dateIdx] ?? "",
    status: String(row[statusIdx] ?? "").trim(),
    paid_date: row[paidIdx]?.trim() || undefined,
    budget: budgetVal != null && !Number.isNaN(budgetVal) ? budgetVal : undefined,
    purchase_amount:
      purchaseVal != null && !Number.isNaN(purchaseVal) ? purchaseVal : undefined,
  };
}

function parseAboutRow(row: string[]): AboutRow {
  return {
    user_id: row[0] ?? "",
    about_text: row[1] ?? "",
    updated_at: row[2] ?? "",
    avatar_url: row[3]?.trim() || undefined,
  };
}

function csvToRows(csv: string): string[][] {
  const lines = csv.trim().split(/\r?\n/);
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === "," && !inQuotes) || (char === "\n" && !inQuotes)) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

async function getSheetNames(
  spreadsheetId: string,
  serviceAccountJson: string
): Promise<string[]> {
  const credentials = JSON.parse(serviceAccountJson);
  const { google } = await import("googleapis");
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const names =
    meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean) ?? [];
  return names as string[];
}

function getFirstSheetName(sheetNames: string[]): string {
  return sheetNames[0] ?? "Сделки";
}

async function fetchFromGoogleSheets(
  sheetName: string,
  spreadsheetIdOverride?: string
): Promise<string[][]> {
  const spreadsheetId =
    spreadsheetIdOverride ??
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
    process.env.GOOGLE_SHEETS_CONNECTIONS_ID ??
    process.env.GOOGLE_SHEETS_SALES_FUNNEL_ID ??
    CONNECTIONS_SPREADSHEET_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is required");
  }

  const credentials = JSON.parse(serviceAccountJson);
  const { google } = await import("googleapis");
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const tryFetch = async (name: string) => {
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${name}!A:Z`,
    });
    return (r.data.values ?? []) as string[][];
  };

  let rows: string[][];
  try {
    rows = await tryFetch(sheetName);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unable to parse range") || msg.includes("could not find a range")) {
      const allSheets = await getSheetNames(spreadsheetId, serviceAccountJson);
      const fallback = getFirstSheetName(allSheets);
      rows = await tryFetch(fallback);
    } else {
      throw err;
    }
  }

  if (rows.length === 0 || (rows.length === 1 && (rows[0] ?? []).every((c) => !String(c).trim()))) {
    const allSheets = await getSheetNames(spreadsheetId, serviceAccountJson);
    for (const alt of allSheets) {
      if (alt === sheetName) continue;
      try {
        const altRows = await tryFetch(alt);
        if (altRows.length > 0 && (altRows[0] ?? []).some((c) => String(c).trim())) {
          return altRows;
        }
      } catch {
        /* skip */
      }
    }
  }
  return rows;
}

async function writeToGoogleSheets(
  sheetName: string,
  values: string[][]
): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!spreadsheetId || !serviceAccountJson) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON are required");
  }

  const credentials = JSON.parse(serviceAccountJson);
  const { google } = await import("googleapis");
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const range = `${sheetName}!A:D`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

let companiesCacheStore: { data: CompanyRow[]; expiresAt: number } | null = null;
let invoicesCacheStore: { data: InvoiceRow[]; expiresAt: number } | null = null;

export async function fetchCompanies(): Promise<CompanyRow[]> {
  const mode = process.env.MODE ?? "mock";

  if (mode === "mock") {
    return mockCompanies as CompanyRow[];
  }

  if (companiesCacheStore && Date.now() < companiesCacheStore.expiresAt) {
    return companiesCacheStore.data;
  }

  if (mode === "public_csv") {
    const url = process.env.PUBLIC_CSV_COMPANIES_URL;
    if (!url) throw new Error("PUBLIC_CSV_COMPANIES_URL is required for MODE=public_csv");
    const res = await fetch(url);
    const csv = await res.text();
    const rows = csvToRows(csv);
    const headers = rows[0] ?? [];
    const data = rows.slice(1).map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = row[i] ?? "";
      });
      return parseCompanyRow([
        record.user_id ?? "",
        record.company_id ?? "",
        record.company_name ?? "",
        record.contact_name ?? "",
        record.created_at ?? "",
      ]);
    });
    companiesCacheStore = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return data;
  }

  if (mode === "service_account") {
    const spreadsheetId =
      process.env.GOOGLE_SHEETS_CONNECTIONS_ID ??
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
      CONNECTIONS_SPREADSHEET_ID;
    const sheetName =
      process.env.CONNECTIONS_SHEET_NAME ??
      (process.env.GOOGLE_SHEETS_CONNECTIONS_ID ? "Сделки" : "Companies");
    const rows = await fetchFromGoogleSheets(sheetName, spreadsheetId);
    const headers = rows[0] ?? [];
    const data = rows.slice(1).map((row) => {
      const userIdx = findColumnIndex(headers, CONNECTIONS_COLUMNS.user_id);
      const companyIdx = findColumnIndex(headers, CONNECTIONS_COLUMNS.company_id);
      const nameIdx = findColumnIndex(headers, CONNECTIONS_COLUMNS.company_name);
      const contactIdx = findColumnIndex(headers, CONNECTIONS_COLUMNS.contact_name);
      const dateIdx = findColumnIndex(headers, CONNECTIONS_COLUMNS.created_at);
      return parseCompanyRow([
        userIdx >= 0 ? row[userIdx] ?? "" : row[0] ?? "",
        companyIdx >= 0 ? row[companyIdx] ?? "" : row[1] ?? "",
        nameIdx >= 0 ? row[nameIdx] ?? "" : row[2] ?? "",
        contactIdx >= 0 ? row[contactIdx] ?? "" : row[3] ?? "",
        dateIdx >= 0 ? row[dateIdx] ?? "" : row[4] ?? "",
      ]);
    });
    companiesCacheStore = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return data;
  }

  return mockCompanies as CompanyRow[];
}

export async function fetchInvoices(): Promise<InvoiceRow[]> {
  const mode = process.env.MODE ?? "mock";

  if (mode === "mock") {
    return mockInvoices as InvoiceRow[];
  }

  if (invoicesCacheStore && Date.now() < invoicesCacheStore.expiresAt) {
    return invoicesCacheStore.data;
  }

  if (mode === "public_csv") {
    const url = process.env.PUBLIC_CSV_INVOICES_URL;
    if (!url) throw new Error("PUBLIC_CSV_INVOICES_URL is required for MODE=public_csv");
    const res = await fetch(url);
    const csv = await res.text();
    const rows = csvToRows(csv);
    const headers = (rows[0] ?? []).map((h) => String(h ?? ""));
    const headerIndices = {
      user_id: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.user_id),
      invoice_number: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.invoice_number),
      sales_amount: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.sales_amount),
      date: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.date),
      status_name: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.status_name),
      paid_date: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.paid_date),
      budget: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.budget),
      purchase_amount: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.purchase_amount),
    };
    const data = rows.slice(1).map((row) => parseInvoiceRow(row, headerIndices));
    invoicesCacheStore = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return data;
  }

  if (mode === "service_account") {
    const spreadsheetId =
      process.env.GOOGLE_SHEETS_SALES_FUNNEL_ID ??
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
      SALES_FUNNEL_SPREADSHEET_ID;
    const sheetName =
      process.env.SALES_FUNNEL_SHEET_NAME ??
      process.env.INVOICES_SHEET_NAME ??
      (process.env.GOOGLE_SHEETS_SALES_FUNNEL_ID ? "Сделки" : "Invoices");
    const rows = await fetchFromGoogleSheets(sheetName, spreadsheetId);
    const headers = (rows[0] ?? []).map((h) => String(h ?? ""));

    const headerIndices = {
      user_id: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.user_id),
      invoice_number: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.invoice_number),
      sales_amount: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.sales_amount),
      date: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.date),
      status_name: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.status_name),
      paid_date: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.paid_date),
      budget: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.budget),
      purchase_amount: findColumnIndex(headers, SALES_FUNNEL_COLUMNS.purchase_amount),
    };

    const data = rows.slice(1).map((row) => parseInvoiceRow(row, headerIndices));
    invoicesCacheStore = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return data;
  }

  return mockInvoices as InvoiceRow[];
}

export async function fetchAbout(userId: string): Promise<AboutRow | null> {
  const mode = process.env.MODE ?? "mock";

  const cached = getAboutFromCache(userId);
  if (cached !== undefined) return cached;

  if (mode === "mock") {
    const aboutList = getMockAbout();
    const row = aboutList.find((r) => r.user_id === userId) ?? null;
    setAboutCache(userId, row);
    return row;
  }

  if (mode === "public_csv") {
    const url = process.env.PUBLIC_CSV_ABOUT_URL;
    if (!url) return null;
    const res = await fetch(url);
    const csv = await res.text();
    const rows = csvToRows(csv);
    const data = rows.slice(1);
    const aboutRow = data.find((row) => (row[0] ?? "") === userId);
    const result: AboutRow | null = aboutRow
      ? parseAboutRow(aboutRow)
      : null;
    setAboutCache(userId, result);
    return result;
  }

  if (mode === "service_account") {
    try {
      const spreadsheetId =
        process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
        process.env.GOOGLE_SHEETS_CONNECTIONS_ID ??
        CONNECTIONS_SPREADSHEET_ID;
      const rows = await fetchFromGoogleSheets("About", spreadsheetId);
      const aboutRow = rows.slice(1).find((row) => (row[0] ?? "") === userId);
      const result: AboutRow | null = aboutRow
        ? parseAboutRow(aboutRow)
        : null;
      setAboutCache(userId, result);
      return result;
    } catch {
      setAboutCache(userId, null);
      return null;
    }
  }

  const aboutList = getMockAbout();
  const row = aboutList.find((r) => r.user_id === userId) ?? null;
  return row;
}

export async function writeAbout(
  userId: string,
  aboutText: string,
  avatarUrl?: string
): Promise<void> {
  const mode = process.env.MODE ?? "mock";

  aboutCache.delete(`about_${userId}`);

  if (mode === "mock") {
    setMockAbout(userId, aboutText, avatarUrl);
    return;
  }

  if (mode === "service_account") {
    const rows = await fetchFromGoogleSheets("About");
    const data = rows.slice(1);
    const existing = data.find((row) => (row[0] ?? "") === userId);
    const aboutTextToWrite = avatarUrl !== undefined ? (existing?.[1] ?? aboutText) : aboutText;
    const avatarToWrite = avatarUrl !== undefined ? avatarUrl : (existing?.[3] ?? "");
    const newRow = [
      userId,
      aboutTextToWrite,
      new Date().toISOString(),
      avatarToWrite,
    ];

    const existingIdx = data.findIndex((row) => (row[0] ?? "") === userId);
    if (existingIdx >= 0) {
      data[existingIdx] = newRow;
    } else {
      data.push(newRow);
    }

    const allRows = [rows[0] ?? ["user_id", "about_text", "updated_at", "avatar_url"], ...data];
    await writeToGoogleSheets("About", allRows);
    return;
  }

  if (mode === "public_csv") {
    throw new Error("writeAbout is not supported in MODE=public_csv (read-only)");
  }

  setMockAbout(userId, aboutText, avatarUrl);
}

export async function updateAvatar(userId: string, avatarUrl: string): Promise<void> {
  const about = await fetchAbout(userId);
  await writeAbout(userId, about?.about_text ?? "", avatarUrl);
}

/** Отладочные сырые данные таблицы связок */
export async function fetchDebugConnectionsRaw(): Promise<{
  sheetNames: string[];
  usedSheet: string;
  headers: string[];
  rowCount: number;
  sampleRows: string[][];
  error?: string;
}> {
  const spreadsheetId =
    process.env.GOOGLE_SHEETS_CONNECTIONS_ID ??
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
    CONNECTIONS_SPREADSHEET_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const mode = process.env.MODE ?? "mock";

  if (mode !== "service_account" || !serviceAccountJson) {
    return {
      sheetNames: [],
      usedSheet: "",
      headers: [],
      rowCount: 0,
      sampleRows: [],
      error: "MODE must be service_account and GOOGLE_SERVICE_ACCOUNT_JSON required",
    };
  }

  try {
    const sheetNames = await getSheetNames(spreadsheetId, serviceAccountJson);
    const sheetName =
      process.env.CONNECTIONS_SHEET_NAME ?? getFirstSheetName(sheetNames);
    const rows = await fetchFromGoogleSheets(sheetName, spreadsheetId);
    const headers = (rows[0] ?? []).map((h) => String(h ?? "").trim());
    const dataRows = rows.slice(1);
    return {
      sheetNames,
      usedSheet: sheetName,
      headers,
      rowCount: dataRows.length,
      sampleRows: dataRows.slice(0, 5),
    };
  } catch (err) {
    return {
      sheetNames: [],
      usedSheet: "",
      headers: [],
      rowCount: 0,
      sampleRows: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Отладочные сырые данные таблицы воронки продаж */
export async function fetchDebugSalesFunnelRaw(): Promise<{
  sheetNames: string[];
  usedSheet: string;
  headers: string[];
  rowCount: number;
  sampleRows: string[][];
  statusValues: string[];
  error?: string;
}> {
  const spreadsheetId =
    process.env.GOOGLE_SHEETS_SALES_FUNNEL_ID ??
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
    SALES_FUNNEL_SPREADSHEET_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const mode = process.env.MODE ?? "mock";

  if (mode !== "service_account" || !serviceAccountJson) {
    return {
      sheetNames: [],
      usedSheet: "",
      headers: [],
      rowCount: 0,
      sampleRows: [],
      statusValues: [],
      error: "MODE must be service_account and GOOGLE_SERVICE_ACCOUNT_JSON required",
    };
  }

  try {
    const sheetNames = await getSheetNames(spreadsheetId, serviceAccountJson);
    const sheetName =
      process.env.SALES_FUNNEL_SHEET_NAME ??
      process.env.INVOICES_SHEET_NAME ??
      getFirstSheetName(sheetNames);
    const rows = await fetchFromGoogleSheets(sheetName, spreadsheetId);
    const headers = (rows[0] ?? []).map((h) => String(h ?? "").trim());
    const dataRows = rows.slice(1);
    const statusIdx = headers.findIndex((h) =>
      /имя статуса|статус сделки/i.test(String(h).trim()) && !/^ид статуса$/i.test(String(h).trim())
    );
    const statusValues =
      statusIdx >= 0
        ? [...new Set(dataRows.map((r) => String(r[statusIdx] ?? "").trim()).filter(Boolean))]
        : [];

    return {
      sheetNames,
      usedSheet: sheetName,
      headers,
      rowCount: dataRows.length,
      sampleRows: dataRows.slice(0, 5),
      statusValues,
    };
  } catch (err) {
    return {
      sheetNames: [],
      usedSheet: "",
      headers: [],
      rowCount: 0,
      sampleRows: [],
      statusValues: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
