// Financial-domain errors extending the verifier-kit error hierarchy.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class FinancialDataUnavailableError extends AppError {
  constructor(ticker: string, source: string, opts?: Partial<AppErrorOptions>) {
    super(
      "UNAVAILABLE",
      503,
      `Financial data for ${ticker} unavailable from ${source}`,
      { details: { ticker, source }, ...opts },
    );
  }
}

export class InvalidTickerSymbolError extends AppError {
  constructor(symbol: string, opts?: Partial<AppErrorOptions>) {
    super(
      "VALIDATION",
      422,
      `Invalid or unrecognised ticker symbol: ${symbol}`,
      { details: { symbol }, ...opts },
    );
  }
}

export class EdgarFilingNotFoundError extends AppError {
  constructor(cik: string, formType: string, opts?: Partial<AppErrorOptions>) {
    super(
      "NOT_FOUND",
      404,
      `No EDGAR filing found for CIK ${cik} with form type ${formType}`,
      { details: { cik, formType }, ...opts },
    );
  }
}

export class FundamentalsParseError extends AppError {
  constructor(field: string, raw: unknown, opts?: Partial<AppErrorOptions>) {
    super(
      "VALIDATION",
      422,
      `Failed to parse fundamental metric "${field}"`,
      { details: { field, raw }, ...opts },
    );
  }
}

export class MarketDataStaleError extends AppError {
  constructor(ticker: string, ageMs: number, opts?: Partial<AppErrorOptions>) {
    super(
      "VALIDATION",
      422,
      `Market data for ${ticker} is stale (age: ${ageMs}ms)`,
      { details: { ticker, ageMs }, ...opts },
    );
  }
}

export class FinancialClaimAmbiguousError extends AppError {
  constructor(claimId: string, reason: string, opts?: Partial<AppErrorOptions>) {
    super(
      "VALIDATION",
      422,
      `Financial claim ${claimId} is ambiguous: ${reason}`,
      { details: { claimId, reason }, ...opts },
    );
  }
}
