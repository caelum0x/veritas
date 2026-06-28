// Crypto-specific LLM prompts for on-chain evidence adjudication.

import type { VerifiableClaim } from "@veritas/verifier-kit";

/** System prompt establishing the crypto fact-checker persona. */
export const CRYPTO_SYSTEM_PROMPT = `You are a blockchain and cryptocurrency fact-verification specialist.
Your task is to assess whether a claim about on-chain activity, smart contracts, token economics,
or cryptocurrency prices is supported, refuted, or unverifiable based on the provided evidence.

Guidelines:
- On-chain data (transaction hashes, contract addresses) is authoritative when confirmed.
- Market cap, price, and supply figures are time-sensitive; note data staleness.
- Smart contract source verification adds credibility to contract-related claims.
- Distinguish between "claim is false" and "claim is unverifiable due to missing data".
- Be precise: if the claim specifies a value (e.g. a price or transfer amount), compare it directly.
- Respond with a brief verdict rationale (2-4 sentences) suitable for a fact-check report.
- Do not speculate about intent or future market movements.`;

/** Evidence summary passed to the LLM for adjudication. */
export interface EvidenceSummary {
  readonly label: string;
  readonly excerpt: string;
  readonly sourceUri: string;
}

/** Build the user-facing prompt for crypto claim analysis. */
export function buildCryptoAnalysisPrompt(
  claim: VerifiableClaim,
  evidence: ReadonlyArray<EvidenceSummary>,
): string {
  const evidenceBlock =
    evidence.length > 0
      ? evidence
          .map(
            (e, i) =>
              `[${i + 1}] ${e.label}\nSource: ${e.sourceUri}\nExcerpt: ${e.excerpt}`,
          )
          .join("\n\n")
      : "No blockchain evidence was retrieved for this claim.";

  return `CLAIM TO VERIFY:
"${claim.text}"

BLOCKCHAIN / CRYPTO EVIDENCE:
${evidenceBlock}

Based on the above evidence, provide a concise fact-check verdict for the claim.
State whether the evidence supports, refutes, or leaves the claim unverifiable,
and briefly explain why.`;
}

/** Build a prompt specifically for on-chain transaction analysis. */
export function buildTxAnalysisPrompt(
  claimText: string,
  txHashes: ReadonlyArray<string>,
  txSummaries: ReadonlyArray<{ hash: string; status: string; valueEth: string; from: string; to: string | null }>,
): string {
  const txBlock =
    txSummaries.length > 0
      ? txSummaries
          .map(
            (tx) =>
              `Hash: ${tx.hash}\nStatus: ${tx.status}\nValue: ${tx.valueEth} ETH\nFrom: ${tx.from}\nTo: ${tx.to ?? "contract creation"}`,
          )
          .join("\n\n")
      : `Queried hashes: ${txHashes.join(", ")} — no data returned.`;

  return `CLAIM: "${claimText}"

TRANSACTION DATA:
${txBlock}

Assess whether the on-chain transaction data confirms or contradicts this claim.`;
}

/** Build a prompt for token/price claim verification. */
export function buildPriceCheckPrompt(
  claimText: string,
  symbol: string,
  currentPriceUsd: number,
  volume24hUsd: number | undefined,
): string {
  return `CLAIM: "${claimText}"

TOKEN: ${symbol}
CURRENT PRICE: $${currentPriceUsd.toFixed(6)} USD
24H VOLUME: ${volume24hUsd != null ? `$${volume24hUsd.toLocaleString()} USD` : "unavailable"}

Does the current market data support or contradict the claim? Consider that prices are volatile
and the claim may refer to a specific point in time.`;
}
