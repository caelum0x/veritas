// Crypto heuristic rules: pattern-based checks that produce pass/warn/fail outcomes.

import type { CryptoClaimContext, TxSummary, TokenFacts, PricePoint } from "./types.js";

/** Outcome of a single heuristic rule evaluation. */
export type RuleOutcome = "pass" | "warn" | "fail";

export interface RuleResult {
  readonly ruleId: string;
  readonly outcome: RuleOutcome;
  readonly rationale: string;
  readonly weight: number;
}

/** Maximum acceptable staleness for price data (5 minutes). */
const MAX_PRICE_AGE_MS = 5 * 60 * 1_000;

/** Extreme return threshold — claims above this are flagged. */
const EXTREME_RETURN_THRESHOLD_PCT = 10_000;

/** Market-cap floor for "legitimate major token" checks (USD). */
const MAJOR_TOKEN_MCAP_USD = 1_000_000;

/** Check whether a claimed return percentage is suspiciously extreme. */
export function ruleExtremeReturn(ctx: CryptoClaimContext): RuleResult {
  const { claimedReturnPct } = ctx;
  if (claimedReturnPct === null) {
    return {
      ruleId: "crypto.extreme_return",
      outcome: "pass",
      rationale: "No return percentage present in claim.",
      weight: 0.1,
    };
  }
  if (Math.abs(claimedReturnPct) >= EXTREME_RETURN_THRESHOLD_PCT) {
    return {
      ruleId: "crypto.extreme_return",
      outcome: "fail",
      rationale: `Claimed return of ${claimedReturnPct}% exceeds plausibility threshold (${EXTREME_RETURN_THRESHOLD_PCT}%).`,
      weight: 0.9,
    };
  }
  return {
    ruleId: "crypto.extreme_return",
    outcome: "pass",
    rationale: `Claimed return of ${claimedReturnPct}% is within plausible range.`,
    weight: 0.5,
  };
}

/** Check whether a transaction exists and succeeded on-chain. */
export function ruleTxSuccess(tx: TxSummary | null): RuleResult {
  if (tx === null) {
    return {
      ruleId: "crypto.tx_success",
      outcome: "fail",
      rationale: "Referenced transaction could not be found on-chain.",
      weight: 0.95,
    };
  }
  if (tx.status === "failed") {
    return {
      ruleId: "crypto.tx_success",
      outcome: "fail",
      rationale: `Transaction ${tx.hash} on ${tx.chainId} has status 'failed'.`,
      weight: 0.9,
    };
  }
  if (tx.status === "pending") {
    return {
      ruleId: "crypto.tx_success",
      outcome: "warn",
      rationale: `Transaction ${tx.hash} on ${tx.chainId} is still pending — cannot verify finality.`,
      weight: 0.6,
    };
  }
  return {
    ruleId: "crypto.tx_success",
    outcome: "pass",
    rationale: `Transaction ${tx.hash} on ${tx.chainId} confirmed successfully.`,
    weight: 0.9,
  };
}

/** Check whether a token meets a minimum market-cap threshold. */
export function ruleTokenMarketCap(token: TokenFacts | null): RuleResult {
  if (token === null) {
    return {
      ruleId: "crypto.token_mcap",
      outcome: "warn",
      rationale: "Token metadata could not be retrieved; market-cap check skipped.",
      weight: 0.4,
    };
  }
  const mcap = token.marketCapUsd;
  if (mcap === null) {
    return {
      ruleId: "crypto.token_mcap",
      outcome: "warn",
      rationale: `Market cap unknown for ${token.symbol}.`,
      weight: 0.3,
    };
  }
  if (mcap < MAJOR_TOKEN_MCAP_USD) {
    return {
      ruleId: "crypto.token_mcap",
      outcome: "warn",
      rationale: `${token.symbol} market cap ($${mcap.toLocaleString()}) is below major-token floor.`,
      weight: 0.5,
    };
  }
  return {
    ruleId: "crypto.token_mcap",
    outcome: "pass",
    rationale: `${token.symbol} market cap ($${mcap.toLocaleString()}) is above threshold.`,
    weight: 0.6,
  };
}

/** Check whether price feed data is fresh enough to be trusted. */
export function rulePriceFeedFreshness(price: PricePoint | null, nowMs: number): RuleResult {
  if (price === null) {
    return {
      ruleId: "crypto.price_freshness",
      outcome: "warn",
      rationale: "No price data available; freshness check skipped.",
      weight: 0.3,
    };
  }
  const observedMs = new Date(price.observedAt).getTime();
  const ageMs = nowMs - observedMs;
  if (ageMs > MAX_PRICE_AGE_MS) {
    return {
      ruleId: "crypto.price_freshness",
      outcome: "warn",
      rationale: `Price for ${price.symbol} is ${Math.round(ageMs / 1_000)}s old (max allowed: ${MAX_PRICE_AGE_MS / 1_000}s).`,
      weight: 0.6,
    };
  }
  return {
    ruleId: "crypto.price_freshness",
    outcome: "pass",
    rationale: `Price for ${price.symbol} is fresh (${Math.round(ageMs / 1_000)}s old).`,
    weight: 0.5,
  };
}

/** Check claimed price against live feed; returns fail when deviation exceeds threshold. */
export function rulePriceDeviation(
  ctx: CryptoClaimContext,
  price: PricePoint | null,
  deviationThresholdPct: number = 20
): RuleResult {
  if (ctx.claimedPriceUsd === null || price === null) {
    return {
      ruleId: "crypto.price_deviation",
      outcome: "pass",
      rationale: "Price deviation check skipped (no claimed price or feed unavailable).",
      weight: 0.1,
    };
  }
  const devPct = Math.abs((ctx.claimedPriceUsd - price.priceUsd) / price.priceUsd) * 100;
  if (devPct > deviationThresholdPct) {
    return {
      ruleId: "crypto.price_deviation",
      outcome: "fail",
      rationale: `Claimed price $${ctx.claimedPriceUsd} deviates ${devPct.toFixed(1)}% from live feed $${price.priceUsd} (threshold: ${deviationThresholdPct}%).`,
      weight: 0.85,
    };
  }
  return {
    ruleId: "crypto.price_deviation",
    outcome: "pass",
    rationale: `Claimed price $${ctx.claimedPriceUsd} within ${devPct.toFixed(1)}% of live feed.`,
    weight: 0.8,
  };
}
