export interface MockCompanyRow {
  user_id: string;
  company_id: string;
  company_name: string;
  contact_name: string;
  created_at: string;
}

export interface MockInvoiceRow {
  user_id: string;
  invoice_id: string;
  invoice_amount: number;
  invoice_date: string;
  status: string;
  paid_date?: string;
  margin?: number;
  budget?: number;
  purchase_amount?: number;
}

export interface MockAboutRow {
  user_id: string;
  about_text: string;
  updated_at: string;
  avatar_url?: string;
}

/** Test user: 0 companies with contact → Bronze */
export const mockCompanies0: MockCompanyRow[] = [
  { user_id: "user_0", company_id: "c1", company_name: "Co1", contact_name: "", created_at: "2024-01-01" },
  { user_id: "user_0", company_id: "c2", company_name: "Co2", contact_name: "", created_at: "2024-01-02" },
];

/** Test user: 99 companies → Bronze */
export const mockCompanies99: MockCompanyRow[] = Array.from({ length: 99 }, (_, i) => ({
  user_id: "user_99",
  company_id: `c${i + 1}`,
  company_name: `Company ${i + 1}`,
  contact_name: `Contact ${i + 1}`,
  created_at: "2024-01-01",
}));

/** Test user: 100 companies → Silver */
export const mockCompanies100: MockCompanyRow[] = Array.from({ length: 100 }, (_, i) => ({
  user_id: "user_100",
  company_id: `c${i + 1}`,
  company_name: `Company ${i + 1}`,
  contact_name: `Contact ${i + 1}`,
  created_at: "2024-01-01",
}));

/** Test user: 300 companies → Gold */
export const mockCompanies300: MockCompanyRow[] = Array.from({ length: 300 }, (_, i) => ({
  user_id: "user_300",
  company_id: `c${i + 1}`,
  company_name: `Company ${i + 1}`,
  contact_name: `Contact ${i + 1}`,
  created_at: "2024-01-01",
}));

/** Test user: 900 companies → Platinum */
export const mockCompanies900: MockCompanyRow[] = Array.from({ length: 900 }, (_, i) => ({
  user_id: "user_900",
  company_id: `c${i + 1}`,
  company_name: `Company ${i + 1}`,
  contact_name: `Contact ${i + 1}`,
  created_at: "2024-01-01",
}));

/** Test user: 1200 companies → Diamond */
export const mockCompanies1200: MockCompanyRow[] = Array.from({ length: 1200 }, (_, i) => ({
  user_id: "user_1200",
  company_id: `c${i + 1}`,
  company_name: `Company ${i + 1}`,
  contact_name: `Contact ${i + 1}`,
  created_at: "2024-01-01",
}));

/** Test user: 1500 companies → Master */
export const mockCompanies1500: MockCompanyRow[] = Array.from({ length: 1500 }, (_, i) => ({
  user_id: "user_1500",
  company_id: `c${i + 1}`,
  company_name: `Company ${i + 1}`,
  contact_name: `Contact ${i + 1}`,
  created_at: "2024-01-01",
}));

/** Test user: 15000 companies → Legend */
export const mockCompanies15000: MockCompanyRow[] = Array.from({ length: 15000 }, (_, i) => ({
  user_id: "user_15000",
  company_id: `c${i + 1}`,
  company_name: `Company ${i + 1}`,
  contact_name: `Contact ${i + 1}`,
  created_at: "2024-01-01",
}));

/** Main demo user: 250 companies (Silver), full invoice coverage */
export const mockCompaniesDemo: MockCompanyRow[] = Array.from({ length: 250 }, (_, i) => ({
  user_id: "demo_user",
  company_id: `demo_c${i + 1}`,
  company_name: `Demo Company ${i + 1}`,
  contact_name: `Contact ${i + 1}`,
  created_at: "2024-01-01",
}));

/** Invoices for user with 0 issued → no division by zero */
export const mockInvoicesEmpty: MockInvoiceRow[] = [];

/** Invoices: issued only, no paid */
export const mockInvoicesNoPaid: MockInvoiceRow[] = [
  { user_id: "user_no_paid", invoice_id: "inv1", invoice_amount: 10000, invoice_date: "2024-01-01", status: "В работе" },
  { user_id: "user_no_paid", invoice_id: "inv2", invoice_amount: 50000, invoice_date: "2024-01-02", status: "В работе" },
];

/** Invoices: all 5 buckets, mixed statuses. Маржа = (продажа - закупка) / продажа * 100 */
export const mockInvoicesBuckets: MockInvoiceRow[] = [
  { user_id: "demo_user", invoice_id: "inv1", invoice_amount: 25000, invoice_date: "2024-01-01", status: "PAID", paid_date: "2024-01-05", budget: 25000, purchase_amount: 20500 },
  { user_id: "demo_user", invoice_id: "inv2", invoice_amount: 40000, invoice_date: "2024-01-02", status: "PAID", paid_date: "2024-01-06", budget: 40000, purchase_amount: 31200 },
  { user_id: "demo_user", invoice_id: "inv3", invoice_amount: 100000, invoice_date: "2024-01-03", status: "PAID", paid_date: "2024-01-07", budget: 100000, purchase_amount: 75000 },
  { user_id: "demo_user", invoice_id: "inv4", invoice_amount: 150000, invoice_date: "2024-01-04", status: "В работе", budget: 150000, purchase_amount: 120000 },
  { user_id: "demo_user", invoice_id: "inv5", invoice_amount: 350000, invoice_date: "2024-01-05", status: "PAID", paid_date: "2024-01-10", budget: 350000, purchase_amount: 252000 },
  { user_id: "demo_user", invoice_id: "inv6", invoice_amount: 750000, invoice_date: "2024-01-06", status: "PAID", paid_date: "2024-01-12", budget: 750000, purchase_amount: 525000 },
  { user_id: "demo_user", invoice_id: "inv7", invoice_amount: 1500000, invoice_date: "2024-01-07", status: "PAID", paid_date: "2024-01-15", budget: 1500000, purchase_amount: 1020000 },
  { user_id: "demo_user", invoice_id: "inv8", invoice_amount: 3000000, invoice_date: "2024-01-08", status: "В работе", budget: 3000000, purchase_amount: 2250000 },
  { user_id: "demo_user", invoice_id: "", invoice_amount: 5000, invoice_date: "2024-01-09", status: "Отказ" },
  { user_id: "demo_user", invoice_id: "", invoice_amount: 80000, invoice_date: "2024-01-10", status: "Отказ" },
];

/** About for demo user */
let mockAboutStore: MockAboutRow[] = [
  { user_id: "demo_user", about_text: "Experienced sales professional.", updated_at: "2024-02-01T12:00:00Z" },
  { user_id: "user_0", about_text: "", updated_at: "2024-01-01T00:00:00Z" },
];

export function getMockAbout(): MockAboutRow[] {
  return [...mockAboutStore];
}

export function setMockAbout(userId: string, aboutText: string, avatarUrl?: string): void {
  const existing = mockAboutStore.find((r) => r.user_id === userId);
  const updated: MockAboutRow = {
    user_id: userId,
    about_text: aboutText,
    updated_at: new Date().toISOString(),
    avatar_url: avatarUrl !== undefined ? avatarUrl : existing?.avatar_url,
  };
  if (existing) {
    mockAboutStore = mockAboutStore.map((r) => (r.user_id === userId ? updated : r));
  } else {
    mockAboutStore = [...mockAboutStore, updated];
  }
}

/** Combined mock data for MODE=mock */
export const mockCompanies: MockCompanyRow[] = [
  ...mockCompanies0,
  ...mockCompanies99,
  ...mockCompanies100,
  ...mockCompanies300,
  ...mockCompanies900,
  ...mockCompanies1200,
  ...mockCompanies1500,
  ...mockCompanies15000,
  ...mockCompaniesDemo,
];

export const mockInvoices: MockInvoiceRow[] = [
  ...mockInvoicesEmpty,
  ...mockInvoicesNoPaid,
  ...mockInvoicesBuckets,
];
