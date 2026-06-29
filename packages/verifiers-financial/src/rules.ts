// Financial heuristic rules: validate claimed values against authoritative data.
import { asScore, clampScore, type Verdict } from "@veritas/core";
import type { CompanyFundamentals, MarketSnapshot, ParsedFinancialClaim, RuleResult } from "./types.js";

const VERIFIER_ID = "financial-rules";

/** Relative tolerance for numeric comparison (±5%). */
const NUMERIC_TOLERANCE = 0.05;

function numericMatch(claimed: number, actual: number, tolerance = NUMERIC_TOLERANCE): boolean {
  if (actual === 0) return claimed === 0;
  return Math.abs((claimed - actual) / actual) <= tolerance;
}

function verdictFromMatch(match: boolean, confident: boolean): Verdict {
  if (match) return "SUPPORTED";
  return confident ? "REFUTED" : "UNVERIFIABLE";
}

/** Rule: claimed metric value is within tolerance of the reported fundamental. */
export function checkFundamentalsAccuracy(
  claim: ParsedFinancialClaim,
  fundamentals: CompanyFundamentals,
): RuleResult {
  const metricMap: Partial<Record<string, number | undefined>> = {
    revenue: fundamentals.revenue,
    net_income: fundamentals.netIncome,
    eps: fundamentals.eps,
    market_cap: fundamentals.marketCap,
    pe_ratio: fundamentals.peRatio,
    debt_to_equity: fundamentals.debtToEquity,
    operating_cash_flow: fundamentals.operatingCashFlow,
    gross_margin: fundamentals.grossMarginPct,
    dividend_yield: fundamentals.dividendYield,
    shares_outstanding: fundamentals.sharesOutstanding,
    book_value: fundamentals.bookValue,
    ebitda: fundamentals.ebitda,
    free_cash_flow: fundamentals.freeCashFlow,
  };

  const actual = metricMap[claim.metric];
  if (actual === undefined || actual === null) {
    return {
      ruleId: "fundamentals-accuracy",
      passed: false,
      score: asScore(0.3),
      verdict: "UNVERIFIABLE",
      rationale: `Metric "${claim.metric}" not present in fundamentals for ${claim.ticker}.`,
    };
  }

  const passed = numericMatch(claim.claimedValue, actual);
  const pctDiff = actual !== 0 ? Math.abs((claim.claimedValue - actual) / actual) : 0;
  const score = clampScore(passed ? 1 - pctDiff * 2 : Math.max(0, 0.5 - pctDiff));
  const verdict: Verdict = verdictFromMatch(passed, true);

  return {
    ruleId: "fundamentals-accuracy",
    passed,
    score: asScore(score),
    verdict,
    rationale: passed
      ? `Claimed ${claim.metric} (${claim.claimedValue}) matches reported value (${actual}) within ${NUMERIC_TOLERANCE * 100}%.`
      : `Claimed ${claim.metric} (${claim.claimedValue}) deviates from reported value (${actual}) by ${(pctDiff * 100).toFixed(1)}%.`,
    details: { claimed: claim.claimedValue, actual, pctDiff },
  };
}

/** Rule: market price claim is within tolerance of the current snapshot. */
export function checkMarketPriceAccuracy(
  claim: ParsedFinancialClaim,
  snapshot: MarketSnapshot,
): RuleResult {
  if (claim.metric !== "price" && claim.metric !== "volume") {
    return {
      ruleId: "market-price-accuracy",
      passed: true,
      score: asScore(0.8),
      verdict: "UNVERIFIABLE",
      rationale: "Rule only applies to price/volume claims; skipped.",
    };
  }

  const actual = claim.metric === "price" ? snapshot.price : snapshot.volume;
  const passed = numericMatch(claim.claimedValue, actual, 0.02);
  const pctDiff = actual !== 0 ? Math.abs((claim.claimedValue - actual) / actual) : 0;
  const score = clampScore(passed ? 0.9 : Math.max(0, 0.6 - pctDiff));

  return {
    ruleId: "market-price-accuracy",
    passed,
    score: asScore(score),
    verdict: snapshot.isDelayed ? "UNVERIFIABLE" : verdictFromMatch(passed, true),
    rationale: snapshot.isDelayed
      ? `Market data is delayed; price comparison is indicative only (claimed ${claim.claimedValue}, snapshot ${actual}).`
      : passed
        ? `Claimed ${claim.metric} (${claim.claimedValue}) matches market snapshot (${actual}).`
        : `Claimed ${claim.metric} (${claim.claimedValue}) diverges from market snapshot (${actual}) by ${(pctDiff * 100).toFixed(1)}%.`,
    details: { claimed: claim.claimedValue, actual, isDelayed: snapshot.isDelayed },
  };
}

/** Rule: ticker in claim matches company name from fundamentals. */
export function checkTickerConsistency(
  claim: ParsedFinancialClaim,
  fundamentals: CompanyFundamentals,
): RuleResult {
  const tickerMatch = claim.ticker.toUpperCase() === fundamentals.ticker.toUpperCase();
  return {
    ruleId: "ticker-consistency",
    passed: tickerMatch,
    score: asScore(tickerMatch ? 1.0 : 0.0),
    verdict: tickerMatch ? "SUPPORTED" : "REFUTED",
    rationale: tickerMatch
      ? `Ticker "${claim.ticker}" matches source record.`
      : `Ticker mismatch: claim uses "${claim.ticker}" but source record has "${fundamentals.ticker}".`,
    details: { claimTicker: claim.ticker, sourceTicker: fundamentals.ticker },
  };
}

/** Rule: reported period in fundamentals aligns with the claim's stated period. */
export function checkPeriodAlignment(
  claim: ParsedFinancialClaim,
  fundamentals: CompanyFundamentals,
): RuleResult {
  if (!claim.period) {
    return {
      ruleId: "period-alignment",
      passed: true,
      score: asScore(0.5),
      verdict: "UNVERIFIABLE",
      rationale: "No period specified in claim; skipping alignment check.",
    };
  }

  const periodLabel = claim.period.label.toLowerCase();
  const fundPeriod = fundamentals.periodLabel.toLowerCase();
  const aligned = fundPeriod.includes(periodLabel) || periodLabel.includes(String(claim.period.year));

  return {
    ruleId: "period-alignment",
    passed: aligned,
    score: asScore(aligned ? 0.9 : 0.4),
    verdict: aligned ? "SUPPORTED" : "UNVERIFIABLE",
    rationale: aligned
      ? `Claimed period "${claim.period.label}" aligns with reported period "${fundamentals.periodLabel}".`
      : `Claimed period "${claim.period.label}" does not match reported period "${fundamentals.periodLabel}".`,
    details: { claimPeriod: claim.period.label, sourcePeriod: fundamentals.periodLabel },
  };
}

/** Run all applicable financial rules and return an immutable list of results. */
export function applyFinancialRules(
  claim: ParsedFinancialClaim,
  fundamentals: CompanyFundamentals | undefined,
  snapshot: MarketSnapshot | undefined,
): ReadonlyArray<RuleResult> {
  const results: RuleResult[] = [];

  if (fundamentals) {
    results.push(
      checkTickerConsistency(claim, fundamentals),
      checkPeriodAlignment(claim, fundamentals),
      checkFundamentalsAccuracy(claim, fundamentals),
    );
  }

  if (snapshot) {
    results.push(checkMarketPriceAccuracy(claim, snapshot));
  }

  if (results.length === 0) {
    results.push({
      ruleId: "no-data-available",
      passed: false,
      score: asScore(0.1),
      verdict: "UNVERIFIABLE",
      rationale: `No authoritative data available for ticker "${claim.ticker}".`,
    });
  }

  return Object.freeze(results);
}

export { VERIFIER_ID };
