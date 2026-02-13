import { describe, it, expect } from "vitest";
import {
  getCompaniesCount,
  computeTotals,
  aggregateByBuckets,
  computeMetrics,
  type CompanyRow,
  type InvoiceRow,
} from "@/lib/metrics";
import { BUCKETS } from "@/config/league";

const emptyCompanies: CompanyRow[] = [];
const emptyInvoices: InvoiceRow[] = [];

describe("getCompaniesCount", () => {
  it("returns 0 when no companies with contact", () => {
    const companies: CompanyRow[] = [
      { user_id: "u1", company_id: "c1", company_name: "Co1", contact_name: "", created_at: "2024-01-01" },
      { user_id: "u1", company_id: "c2", company_name: "Co2", contact_name: "  ", created_at: "2024-01-01" },
    ];
    expect(getCompaniesCount(companies, "u1")).toBe(0);
  });

  it("counts unique company_id where contact_name is filled", () => {
    const companies: CompanyRow[] = [
      { user_id: "u1", company_id: "c1", company_name: "Co1", contact_name: "John", created_at: "2024-01-01" },
      { user_id: "u1", company_id: "c2", company_name: "Co2", contact_name: "Jane", created_at: "2024-01-01" },
      { user_id: "u1", company_id: "c1", company_name: "Co1 again", contact_name: "John", created_at: "2024-01-02" },
    ];
    expect(getCompaniesCount(companies, "u1")).toBe(2);
  });

  it("filters by user_id", () => {
    const companies: CompanyRow[] = [
      { user_id: "u1", company_id: "c1", company_name: "Co1", contact_name: "John", created_at: "2024-01-01" },
      { user_id: "u2", company_id: "c2", company_name: "Co2", contact_name: "Jane", created_at: "2024-01-01" },
    ];
    expect(getCompaniesCount(companies, "u1")).toBe(1);
    expect(getCompaniesCount(companies, "u2")).toBe(1);
    expect(getCompaniesCount(companies, "u3")).toBe(0);
  });
});

describe("computeTotals", () => {
  it("returns 0 for all when no invoices", () => {
    const totals = computeTotals(emptyInvoices, "u1");
    expect(totals.issued_total).toBe(0);
    expect(totals.paid_total).toBe(0);
    expect(totals.conversion_total).toBe(0);
    expect(totals.paid_sum_total).toBe(0);
    expect(totals.cancelled_count).toBe(0);
  });

  it("protects against division by zero when issued_total is 0", () => {
    const invoices: InvoiceRow[] = [
      { user_id: "u1", invoice_id: "", invoice_amount: 100, invoice_date: "2024-01-01", status: "Отказ" },
    ];
    const totals = computeTotals(invoices, "u1");
    expect(totals.issued_total).toBe(0);
    expect(totals.conversion_total).toBe(0);
  });

  it("calculates conversion correctly", () => {
    const invoices: InvoiceRow[] = [
      { user_id: "u1", invoice_id: "i1", invoice_amount: 100, invoice_date: "2024-01-01", status: "В работе" },
      { user_id: "u1", invoice_id: "i2", invoice_amount: 200, invoice_date: "2024-01-02", status: "Успешно реализовано" },
    ];
    const totals = computeTotals(invoices, "u1");
    expect(totals.issued_total).toBe(2);
    expect(totals.paid_total).toBe(1);
    expect(totals.conversion_total).toBe(0.5);
    expect(totals.paid_sum_total).toBe(200);
    expect(totals.cancelled_count).toBe(1);
  });

  it("when no invoice number, not counted as issued", () => {
    const invoices: InvoiceRow[] = [
      { user_id: "u1", invoice_id: "", invoice_amount: 100, invoice_date: "2024-01-01", status: "Отказ" },
    ];
    const totals = computeTotals(invoices, "u1");
    expect(totals.issued_total).toBe(0);
  });
});

describe("getLeague boundary values", () => {
  it("99 companies -> Bronze", () => {
    const companies: CompanyRow[] = Array.from({ length: 99 }, (_, i) => ({
      user_id: "u",
      company_id: `c${i}`,
      company_name: `Co${i}`,
      contact_name: "X",
      created_at: "2024-01-01",
    }));
    const metrics = computeMetrics(companies, emptyInvoices, "u");
    expect(metrics.league.id).toBe("bronze");
    expect(metrics.companies_count).toBe(99);
  });

  it("100 companies -> Silver", () => {
    const companies: CompanyRow[] = Array.from({ length: 100 }, (_, i) => ({
      user_id: "u",
      company_id: `c${i}`,
      company_name: `Co${i}`,
      contact_name: "X",
      created_at: "2024-01-01",
    }));
    const metrics = computeMetrics(companies, emptyInvoices, "u");
    expect(metrics.league.id).toBe("silver");
    expect(metrics.companies_count).toBe(100);
  });

  it("300 companies -> Gold", () => {
    const companies: CompanyRow[] = Array.from({ length: 300 }, (_, i) => ({
      user_id: "u",
      company_id: `c${i}`,
      company_name: `Co${i}`,
      contact_name: "X",
      created_at: "2024-01-01",
    }));
    const metrics = computeMetrics(companies, emptyInvoices, "u");
    expect(metrics.league.id).toBe("gold");
  });

  it("900 companies -> Platinum", () => {
    const companies: CompanyRow[] = Array.from({ length: 900 }, (_, i) => ({
      user_id: "u",
      company_id: `c${i}`,
      company_name: `Co${i}`,
      contact_name: "X",
      created_at: "2024-01-01",
    }));
    const metrics = computeMetrics(companies, emptyInvoices, "u");
    expect(metrics.league.id).toBe("platinum");
  });

  it("1200 companies -> Diamond", () => {
    const companies: CompanyRow[] = Array.from({ length: 1200 }, (_, i) => ({
      user_id: "u",
      company_id: `c${i}`,
      company_name: `Co${i}`,
      contact_name: "X",
      created_at: "2024-01-01",
    }));
    const metrics = computeMetrics(companies, emptyInvoices, "u");
    expect(metrics.league.id).toBe("diamond");
  });

  it("1500 companies -> Master", () => {
    const companies: CompanyRow[] = Array.from({ length: 1500 }, (_, i) => ({
      user_id: "u",
      company_id: `c${i}`,
      company_name: `Co${i}`,
      contact_name: "X",
      created_at: "2024-01-01",
    }));
    const metrics = computeMetrics(companies, emptyInvoices, "u");
    expect(metrics.league.id).toBe("master");
  });

  it("15000 companies -> Legend", () => {
    const companies: CompanyRow[] = Array.from({ length: 15000 }, (_, i) => ({
      user_id: "u",
      company_id: `c${i}`,
      company_name: `Co${i}`,
      contact_name: "X",
      created_at: "2024-01-01",
    }));
    const metrics = computeMetrics(companies, emptyInvoices, "u");
    expect(metrics.league.id).toBe("legend");
  });

  it("0 companies -> Bronze", () => {
    const metrics = computeMetrics(emptyCompanies, emptyInvoices, "u");
    expect(metrics.league.id).toBe("bronze");
    expect(metrics.companies_count).toBe(0);
  });
});

describe("aggregateByBuckets", () => {
  it("returns 5 buckets", () => {
    const buckets = aggregateByBuckets(emptyInvoices, "u1");
    expect(buckets).toHaveLength(5);
    expect(BUCKETS).toHaveLength(5);
  });

  it("correctly assigns invoices to buckets", () => {
    const invoices: InvoiceRow[] = [
      { user_id: "u1", invoice_id: "i1", invoice_amount: 25000, invoice_date: "2024-01-01", status: "Успешно реализовано" },
      { user_id: "u1", invoice_id: "i2", invoice_amount: 100000, invoice_date: "2024-01-02", status: "Успешно реализовано" },
      { user_id: "u1", invoice_id: "i3", invoice_amount: 350000, invoice_date: "2024-01-03", status: "Успешно реализовано" },
      { user_id: "u1", invoice_id: "i4", invoice_amount: 750000, invoice_date: "2024-01-04", status: "Успешно реализовано" },
      { user_id: "u1", invoice_id: "i5", invoice_amount: 2000000, invoice_date: "2024-01-05", status: "Успешно реализовано" },
    ];
    const buckets = aggregateByBuckets(invoices, "u1");

    const under50k = buckets.find((b) => b.bucket_id === "<50k");
    expect(under50k?.issued_count_bucket).toBe(1);
    expect(under50k?.paid_count_bucket).toBe(1);
    expect(under50k?.paid_sum_bucket).toBe(25000);

    const bucket50_200 = buckets.find((b) => b.bucket_id === "50-200k");
    expect(bucket50_200?.paid_sum_bucket).toBe(100000);

    const bucket200_500 = buckets.find((b) => b.bucket_id === "200-500k");
    expect(bucket200_500?.paid_sum_bucket).toBe(350000);

    const bucket500k_1M = buckets.find((b) => b.bucket_id === "500k-1M");
    expect(bucket500k_1M?.paid_sum_bucket).toBe(750000);

    const over1M = buckets.find((b) => b.bucket_id === ">1M");
    expect(over1M?.paid_sum_bucket).toBe(2000000);
  });

  it("deals without invoice number not counted in issued_count_bucket", () => {
    const invoices: InvoiceRow[] = [
      { user_id: "u1", invoice_id: "", invoice_amount: 25000, invoice_date: "2024-01-01", status: "Отказ" },
    ];
    const buckets = aggregateByBuckets(invoices, "u1");
    const under50k = buckets.find((b) => b.bucket_id === "<50k");
    expect(under50k?.issued_count_bucket).toBe(0);
    expect(under50k?.paid_sum_bucket).toBe(0);
  });
});
