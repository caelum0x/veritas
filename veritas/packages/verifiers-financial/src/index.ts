// Public surface of @veritas/verifiers-financial.
export { FinancialVerifier, createFinancialVerifier } from "./verifier.js";

export {
  checkFundamentalsAccuracy,
  checkMarketPriceAccuracy,
  checkTickerConsistency,
  checkPeriodAlignment,
  applyFinancialRules,
} from "./rules.js";

export { computeFinancialScore } from "./scoring.js";

export { canHandleFinancialClaim, extractTickers, financialRelevanceScore } from "./matcher.js";

export {
  makeFinancialEvidenceResult,
} from "./evidence.js";

export { makeFinancialSignals } from "./signals.js";

export {
  buildFinancialAnalysisPrompt,
  buildTickerExtractionPrompt,
  buildStancePrompt,
  FINANCIAL_SYSTEM_PROMPT,
} from "./prompts.js";

export {
  FinancialDataUnavailableError,
  InvalidTickerSymbolError,
  EdgarFilingNotFoundError,
  FundamentalsParseError,
  MarketDataStaleError,
  FinancialClaimAmbiguousError,
} from "./errors.js";

export type {
  FinancialMetric,
  FinancialPeriod,
  ParsedFinancialClaim,
  CompanyFundamentals,
  MarketSnapshot,
  EdgarFiling,
  RuleResult,
  FinancialScoreBreakdown,
} from "./types.js";

export {
  FinancialMetricSchema,
  FinancialPeriodSchema,
  ParsedFinancialClaimSchema,
  CompanyFundamentalsSchema,
  MarketSnapshotSchema,
  EdgarFilingSchema,
  RuleResultSchema,
  FinancialScoreBreakdownSchema,
} from "./types.js";

export type {
  SecFilingEvidence,
  MarketDataEvidence,
  FundamentalsEvidence,
  FinancialEvidence,
  FinancialEvidenceResult,
} from "./evidence.js";

export type { EdgarDataSourcePort as EdgarPort, EdgarFilingMetadata } from "./sources/edgar.js";
export { MockEdgarDataSource, EdgarDataSource, createEdgarSource } from "./sources/edgar.js";

export type { TickerDataSourcePort as TickerPort, TickerProfile } from "./sources/ticker.js";
export { MockTickerDataSource, TickerDataSource, createTickerSource } from "./sources/ticker.js";

export type { FundamentalsDataSourcePort as FundamentalsPort, FinancialFundamentals } from "./sources/fundamentals.js";
export { MockFundamentalsDataSource, FundamentalsDataSource, createFundamentalsSource } from "./sources/fundamentals.js";

export type { MarketDataSourcePort as MarketDataPort, MarketQuote, OhlcvBar } from "./sources/market-data.js";
export { MockMarketDataSource, MarketDataSource, createMarketDataSource } from "./sources/market-data.js";

export type { FilingsDataSourcePort as FilingsPort, SecFiling, FilingSearchFilter } from "./sources/filings.js";
export { MockFilingsDataSource, FilingsDataSource, createFilingsSource } from "./sources/filings.js";
