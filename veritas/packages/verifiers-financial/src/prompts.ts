// Financial-specific LLM prompts: system and user prompt templates for claim analysis.

import type { VerifiableClaim } from "@veritas/verifier-kit";

/** System prompt establishing the financial fact-checker persona. */
export const FINANCIAL_SYSTEM_PROMPT = `You are a financial fact-verification specialist with expertise in:
- SEC filings and regulatory disclosures (10-K, 10-Q, 8-K, S-1, proxy statements)
- Public company financials: revenue, earnings per share, profit margins, debt ratios
- Market data: stock prices, trading volumes, market capitalization
- Financial metrics: P/E ratio, EBITDA, free cash flow, return on equity
- Corporate events: mergers, acquisitions, dividends, share buybacks, spin-offs

Your task is to analyze financial claims against provided evidence and determine their veracity.
Be precise, cite specific numbers and filings, and flag any discrepancies.

Output a JSON object with:
{
  "verdict": "supported" | "refuted" | "partial" | "unverifiable",
  "confidence": number (0-1),
  "rationale": string,
  "keyFindings": string[],
  "dataGaps": string[]
}`;

/** Build a user prompt for financial claim analysis with evidence context. */
export function buildFinancialAnalysisPrompt(
  claim: VerifiableClaim,
  evidenceSummaries: ReadonlyArray<{ label: string; excerpt: string; sourceUri: string }>,
): string {
  const evidenceBlock =
    evidenceSummaries.length > 0
      ? evidenceSummaries
          .map((e, i) => `[${i + 1}] ${e.label}\nSource: ${e.sourceUri}\n${e.excerpt}`)
          .join("\n\n")
      : "No external evidence retrieved.";

  return `Analyze the following financial claim:

CLAIM: "${claim.text}"
${claim.metadata?.ticker ? `TICKER: ${String(claim.metadata.ticker)}` : ""}

EVIDENCE:
${evidenceBlock}

Based on this evidence, determine whether the claim is supported, refuted, partially supported, or unverifiable.
Return your analysis as the specified JSON object.`;
}

/** Build a ticker-extraction prompt to identify company symbols in a claim. */
export function buildTickerExtractionPrompt(claimText: string): string {
  return `Extract any stock tickers, company names, or financial entities from this claim.

CLAIM: "${claimText}"

Return a JSON object:
{
  "tickers": string[],       // e.g. ["AAPL", "MSFT"]
  "companyNames": string[],  // e.g. ["Apple Inc", "Microsoft Corporation"]
  "financialMetrics": string[] // e.g. ["revenue", "EPS", "market cap"]
}

If no entities found, return empty arrays.`;
}

/** Build a stance-assessment prompt for a single evidence item vs a claim. */
export function buildStancePrompt(claimText: string, evidenceExcerpt: string): string {
  return `Does the following evidence support or refute this financial claim?

CLAIM: "${claimText}"

EVIDENCE: "${evidenceExcerpt}"

Return one of: "supports" | "refutes" | "neutral" | "inconclusive"
Respond with only the stance word.`;
}
