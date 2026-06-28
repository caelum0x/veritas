// Fundamentals data source port + mock: income statement, balance sheet, and cash flow data.

import { ok, err, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** Key financial metrics from income statement and ratios. */
export interface FinancialFundamentals {
  readonly symbol: string;
  readonly fiscalYear: number;
  readonly fiscalPeriod: "annual" | "quarterly";
  readonly reportedAt: string;
  /** Total revenues in USD (absolute value). */
  readonly revenue: number;
  /** Gross profit in USD. */
  readonly grossProfit: number;
  /** Operating income in USD. */
  readonly operatingIncome: number;
  /** Net income in USD. */
  readonly netIncome: number;
  /** Earnings per share (diluted). */
  readonly eps: number;
  /** Total assets in USD. */
  readonly totalAssets: number;
  /** Total liabilities in USD. */
  readonly totalLiabilities: number;
  /** Stockholders equity in USD. */
  readonly totalEquity: number;
  /** Free cash flow in USD. */
  readonly freeCashFlow: number;
  /** P/E ratio at reporting date, if available. */
  readonly peRatio?: number;
  /** Gross margin as a fraction [0, 1]. */
  readonly grossMargin: number;
  /** Net profit margin as a fraction [0, 1]. */
  readonly netMargin: number;
}

/** Port interface for fundamental financial data. */
export interface FundamentalsDataSourcePort extends DataSourcePort {
  /** Fetch annual or quarterly fundamentals for a ticker. */
  fetchFundamentals(
    symbol: string,
    period: "annual" | "quarterly",
    limit?: number,
  ): Promise<Result<readonly FinancialFundamentals[], Error>>;
  /** Fetch fundamentals for a specific fiscal year. */
  fetchByYear(symbol: string, year: number): Promise<Result<FinancialFundamentals, Error>>;
}

/** Live fundamentals adapter using a financial data API. */
export class FundamentalsDataSource implements FundamentalsDataSourcePort {
  readonly sourceId = "fundamentals";
  readonly displayName = "Financial Fundamentals";

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl = "https://financialmodelingprep.com/api/v3", apiKey = "") {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const symbol = query.keywords[0] ?? "";
    const result = await this.fetchFundamentals(symbol, "annual", query.maxResults);
    if (result.ok === false) return err(result.error as Error);
    return ok(result.value.map(fundamentalsToDocument));
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const [symbol, yearStr] = id.split(":");
    const year = parseInt(yearStr ?? "", 10);
    if (!symbol || isNaN(year)) return err(new Error(`Invalid fundamentals id: ${id}`));
    const result = await this.fetchByYear(symbol, year);
    if (result.ok === false) return err(result.error as Error);
    return ok(fundamentalsToDocument(result.value));
  }

  async fetchFundamentals(
    symbol: string,
    period: "annual" | "quarterly",
    limit = 4,
  ): Promise<Result<readonly FinancialFundamentals[], Error>> {
    try {
      const url = `${this.baseUrl}/income-statement/${encodeURIComponent(symbol)}?period=${period}&limit=${limit}&apikey=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Fundamentals HTTP ${res.status}`));
      const raw: unknown = await res.json();
      if (!Array.isArray(raw)) return err(new Error("Unexpected fundamentals response shape"));
      return ok(raw.map((item) => parseFundamentals(symbol, period, item as Record<string, unknown>)));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetchByYear(symbol: string, year: number): Promise<Result<FinancialFundamentals, Error>> {
    const result = await this.fetchFundamentals(symbol, "annual", 5);
    if (result.ok === false) return err(result.error as Error);
    const match = result.value.find((f) => f.fiscalYear === year);
    if (!match) return err(new Error(`No fundamentals for ${symbol} FY${year}`));
    return ok(match);
  }
}

function parseFundamentals(
  symbol: string,
  period: "annual" | "quarterly",
  src: Record<string, unknown>,
): FinancialFundamentals {
  const revenue = num(src["revenue"]);
  const grossProfit = num(src["grossProfit"]);
  const netIncome = num(src["netIncome"]);
  const reportedAt = String(src["date"] ?? "");
  const fiscalYear = parseInt(reportedAt.slice(0, 4), 10) || 0;
  return {
    symbol,
    fiscalYear,
    fiscalPeriod: period,
    reportedAt,
    revenue,
    grossProfit,
    operatingIncome: num(src["operatingIncome"]),
    netIncome,
    eps: num(src["eps"]),
    totalAssets: num(src["totalAssets"] ?? src["total_assets"]),
    totalLiabilities: num(src["totalLiabilities"] ?? src["total_liabilities"]),
    totalEquity: num(src["totalStockholdersEquity"] ?? src["totalEquity"]),
    freeCashFlow: num(src["freeCashFlow"]),
    peRatio: typeof src["peRatio"] === "number" ? src["peRatio"] : undefined,
    grossMargin: revenue > 0 ? grossProfit / revenue : 0,
    netMargin: revenue > 0 ? netIncome / revenue : 0,
  };
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function fundamentalsToDocument(f: FinancialFundamentals): SourceDocument {
  const revenueB = (f.revenue / 1e9).toFixed(1);
  const netIncomeB = (f.netIncome / 1e9).toFixed(1);
  return {
    id: `${f.symbol}:${f.fiscalYear}`,
    url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${f.symbol}&type=10-K`,
    title: `${f.symbol} FY${f.fiscalYear} Fundamentals`,
    snippet: `Revenue: $${revenueB}B, Net Income: $${netIncomeB}B, Gross Margin: ${(f.grossMargin * 100).toFixed(1)}%, EPS: $${f.eps.toFixed(2)}.`,
    publishedAt: f.reportedAt,
    metadata: { ...f } as Readonly<Record<string, unknown>>,
  };
}

/** In-memory mock fundamentals source for tests and local development. */
export class MockFundamentalsDataSource extends MockDataSource implements FundamentalsDataSourcePort {
  private readonly fundamentalsMap: ReadonlyMap<string, readonly FinancialFundamentals[]>;

  constructor() {
    super("fundamentals", "Financial Fundamentals (mock)", []);
    this.fundamentalsMap = new Map(
      FUNDAMENTALS_SEED.map((group) => [group[0]!.symbol.toUpperCase(), group]),
    );
  }

  override async search(query: SourceQuery) {
    const symbol = query.keywords[0]?.toUpperCase() ?? "";
    const group = this.fundamentalsMap.get(symbol);
    if (!group) return ok([] as readonly SourceDocument[]);
    return ok(group.slice(0, query.maxResults).map(fundamentalsToDocument) as readonly SourceDocument[]);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const [symbol, yearStr] = id.split(":");
    const year = parseInt(yearStr ?? "", 10);
    const result = await this.fetchByYear(symbol ?? "", year);
    if (result.ok === false) return err(result.error as Error);
    return ok(fundamentalsToDocument(result.value));
  }

  async fetchFundamentals(
    symbol: string,
    _period: "annual" | "quarterly",
    limit = 4,
  ): Promise<Result<readonly FinancialFundamentals[], Error>> {
    const group = this.fundamentalsMap.get(symbol.toUpperCase());
    if (!group) return ok([]);
    return ok(group.slice(0, limit));
  }

  async fetchByYear(symbol: string, year: number): Promise<Result<FinancialFundamentals, Error>> {
    const group = this.fundamentalsMap.get(symbol.toUpperCase()) ?? [];
    const match = group.find((f) => f.fiscalYear === year);
    if (!match) return err(new Error(`MockFundamentals: no data for ${symbol} FY${year}`));
    return ok(match);
  }
}

const FUNDAMENTALS_SEED: readonly (readonly FinancialFundamentals[])[] = [
  [
    { symbol: "AAPL", fiscalYear: 2023, fiscalPeriod: "annual", reportedAt: "2023-09-30", revenue: 383285000000, grossProfit: 169148000000, operatingIncome: 114301000000, netIncome: 96995000000, eps: 6.16, totalAssets: 352583000000, totalLiabilities: 290437000000, totalEquity: 62146000000, freeCashFlow: 99584000000, peRatio: 29.5, grossMargin: 0.441, netMargin: 0.253 },
    { symbol: "AAPL", fiscalYear: 2022, fiscalPeriod: "annual", reportedAt: "2022-09-24", revenue: 394328000000, grossProfit: 170782000000, operatingIncome: 119437000000, netIncome: 99803000000, eps: 6.15, totalAssets: 352755000000, totalLiabilities: 302083000000, totalEquity: 50672000000, freeCashFlow: 111443000000, peRatio: 24.8, grossMargin: 0.433, netMargin: 0.253 },
  ],
  [
    { symbol: "TSLA", fiscalYear: 2023, fiscalPeriod: "annual", reportedAt: "2023-12-31", revenue: 96773000000, grossProfit: 17660000000, operatingIncome: 8891000000, netIncome: 14999000000, eps: 4.30, totalAssets: 106618000000, totalLiabilities: 43009000000, totalEquity: 62634000000, freeCashFlow: 4358000000, peRatio: 55.2, grossMargin: 0.182, netMargin: 0.155 },
  ],
  [
    { symbol: "GOOGL", fiscalYear: 2023, fiscalPeriod: "annual", reportedAt: "2023-12-31", revenue: 307394000000, grossProfit: 174062000000, operatingIncome: 84293000000, netIncome: 73795000000, eps: 5.80, totalAssets: 402392000000, totalLiabilities: 119013000000, totalEquity: 283379000000, freeCashFlow: 69495000000, peRatio: 26.1, grossMargin: 0.566, netMargin: 0.240 },
  ],
];

/** Factory that returns a mock or live fundamentals source. */
export function createFundamentalsSource(mock = false, apiKey = ""): FundamentalsDataSourcePort {
  return mock ? new MockFundamentalsDataSource() : new FundamentalsDataSource(undefined, apiKey);
}
