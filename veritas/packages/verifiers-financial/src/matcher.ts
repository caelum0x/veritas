// Financial claim matcher: detect whether a claim concerns financial or market data.

import type { VerifiableClaim } from "@veritas/verifier-kit";

/** Patterns indicating a claim involves financial data. */
const FINANCIAL_KEYWORDS: ReadonlyArray<string> = [
  "revenue", "earnings", "profit", "loss", "ebitda", "eps", "dividend",
  "stock", "share", "ticker", "ipo", "market cap", "valuation", "equity",
  "debt", "bond", "yield", "interest rate", "quarterly", "fiscal year",
  "sec filing", "10-k", "10-q", "8-k", "annual report", "balance sheet",
  "cash flow", "free cash flow", "operating income", "net income",
  "gross margin", "pe ratio", "p/e", "return on equity", "roe", "roa",
  "acquisition", "merger", "buyback", "spin-off", "ipo", "spac",
  "hedge fund", "private equity", "venture capital", "asset management",
  "index fund", "etf", "option", "futures", "derivative", "short selling",
];

/** Ticker symbol regex: 1–5 uppercase letters optionally preceded by $ or followed by context. */
const TICKER_REGEX = /(?:^|\s)\$?([A-Z]{1,5})(?:\s|$|:)/g;

/** Domain hint values that map to financial. */
const FINANCIAL_DOMAINS: ReadonlySet<string> = new Set([
  "financial", "finance", "sec", "edgar", "market", "stock", "equity",
  "accounting", "earnings", "corporate",
]);

/** Return true if the claim domain hint is financial. */
function hasDomainHint(claim: VerifiableClaim): boolean {
  if (claim.domain == null) return false;
  return FINANCIAL_DOMAINS.has(claim.domain.toLowerCase());
}

/** Return true if the claim text contains financial keywords. */
function hasFinancialKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return FINANCIAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Return true if the claim text contains apparent ticker symbols. */
function hasTickerSymbols(text: string): boolean {
  TICKER_REGEX.lastIndex = 0;
  return TICKER_REGEX.test(text);
}

/** Extract ticker symbols mentioned in a claim (uppercase 1-5 letter sequences). */
export function extractTickers(text: string): ReadonlyArray<string> {
  const tickers: string[] = [];
  const regex = /(?:^|\s)\$?([A-Z]{1,5})(?:\s|$|:)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] != null) tickers.push(match[1]);
  }
  return [...new Set(tickers)];
}

/**
 * Determine if a claim can be handled by the financial verifier.
 * Uses domain hint, keyword matching, and ticker detection.
 */
export function canHandleFinancialClaim(claim: VerifiableClaim): boolean {
  if (hasDomainHint(claim)) return true;
  if (hasFinancialKeywords(claim.text)) return true;
  if (hasTickerSymbols(claim.text)) return true;
  return false;
}

/** Score how strongly a claim appears to be financial [0, 1]. */
export function financialRelevanceScore(claim: VerifiableClaim): number {
  const text = claim.text.toLowerCase();
  const matchCount = FINANCIAL_KEYWORDS.filter((kw) => text.includes(kw)).length;
  const keywordScore = Math.min(1, matchCount / 5);
  const domainBonus = hasDomainHint(claim) ? 0.3 : 0;
  const tickerBonus = hasTickerSymbols(claim.text) ? 0.2 : 0;
  return Math.min(1, keywordScore + domainBonus + tickerBonus);
}
