// Lexical feature extraction from claim text for classification heuristics.

export interface ClaimFeatures {
  readonly text: string;
  readonly lower: string;
  readonly tokens: readonly string[];
  readonly hasNumbers: boolean;
  readonly hasPercent: boolean;
  readonly hasCurrency: boolean;
  readonly hasDate: boolean;
  readonly hasQuotation: boolean;
  readonly hasCausalKeyword: boolean;
  readonly hasComparisonKeyword: boolean;
  readonly hasPredictiveKeyword: boolean;
  readonly hasDefinitionalKeyword: boolean;
  readonly hasEventKeyword: boolean;
  readonly hasFinancialKeyword: boolean;
  readonly hasScientificKeyword: boolean;
  readonly hasMedicalKeyword: boolean;
  readonly hasCryptoKeyword: boolean;
  readonly hasLegalKeyword: boolean;
  readonly hasNewsKeyword: boolean;
}

const CAUSAL_KEYWORDS = [
  "because",
  "causes",
  "caused",
  "leads to",
  "results in",
  "due to",
  "therefore",
  "thus",
  "hence",
  "as a result",
  "consequently",
  "attributed to",
];

const COMPARISON_KEYWORDS = [
  "more than",
  "less than",
  "higher than",
  "lower than",
  "greater than",
  "compared to",
  "versus",
  " vs ",
  "outperforms",
  "better than",
  "worse than",
  "twice",
  "three times",
];

const PREDICTIVE_KEYWORDS = [
  "will",
  "forecast",
  "predict",
  "projected",
  "expected to",
  "estimated to",
  "by 2025",
  "by 2026",
  "by 2030",
  "future",
  "upcoming",
  "anticipate",
];

const DEFINITIONAL_KEYWORDS = [
  " is a ",
  " is an ",
  " are ",
  " refers to",
  " defined as",
  " means ",
  " consists of",
  " constitutes",
];

const EVENT_KEYWORDS = [
  "announced",
  "launched",
  "released",
  "signed",
  "agreed",
  "passed",
  "approved",
  "rejected",
  "arrested",
  "elected",
  "appointed",
  "resigned",
  "died",
  "founded",
];

const FINANCIAL_KEYWORDS = [
  "revenue",
  "profit",
  "loss",
  "earnings",
  "stock",
  "share",
  "market cap",
  "ipo",
  "dividend",
  "gdp",
  "inflation",
  "interest rate",
  "fiscal",
  "quarterly",
  "annual report",
  "sec",
  "edgar",
  "nasdaq",
  "nyse",
];

const SCIENTIFIC_KEYWORDS = [
  "study",
  "research",
  "published",
  "journal",
  "peer-reviewed",
  "experiment",
  "hypothesis",
  "evidence",
  "data shows",
  "findings",
  "scientists",
  "researchers",
  "university",
  "pubmed",
  "doi",
];

const MEDICAL_KEYWORDS = [
  "patients",
  "clinical trial",
  "drug",
  "treatment",
  "therapy",
  "diagnosis",
  "symptom",
  "disease",
  "fda",
  "ema",
  "vaccine",
  "mortality",
  "efficacy",
  "adverse",
  "dosage",
];

const CRYPTO_KEYWORDS = [
  "bitcoin",
  "ethereum",
  "blockchain",
  "crypto",
  "token",
  "defi",
  "nft",
  "wallet",
  "smart contract",
  "protocol",
  "dao",
  "web3",
  "coinbase",
  "binance",
  "on-chain",
];

const LEGAL_KEYWORDS = [
  "court",
  "lawsuit",
  "ruling",
  "verdict",
  "statute",
  "regulation",
  "compliance",
  "plaintiff",
  "defendant",
  "attorney",
  "judge",
  "appeal",
  "legislation",
  "act of",
  "law requires",
];

const NEWS_KEYWORDS = [
  "according to",
  "reported",
  "sources say",
  "officials said",
  "spokesperson",
  "press release",
  "breaking",
  "exclusive",
  "confirmed",
  "denied",
];

function hasAny(lower: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => lower.includes(kw));
}

export function extractFeatures(text: string): ClaimFeatures {
  const lower = text.toLowerCase();
  const tokens = lower.split(/\s+/).filter((t) => t.length > 0);

  return {
    text,
    lower,
    tokens,
    hasNumbers: /\d/.test(text),
    hasPercent: /%|percent|percentage/.test(lower),
    hasCurrency: /\$|€|£|¥|usd|eur|gbp|\bprice\b/.test(lower),
    hasDate:
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{4}\b|\bq[1-4]\b/i.test(
        text
      ),
    hasQuotation: /["'"]/.test(text) || /said|stated|claimed|wrote|tweeted/.test(lower),
    hasCausalKeyword: hasAny(lower, CAUSAL_KEYWORDS),
    hasComparisonKeyword: hasAny(lower, COMPARISON_KEYWORDS),
    hasPredictiveKeyword: hasAny(lower, PREDICTIVE_KEYWORDS),
    hasDefinitionalKeyword: hasAny(lower, DEFINITIONAL_KEYWORDS),
    hasEventKeyword: hasAny(lower, EVENT_KEYWORDS),
    hasFinancialKeyword: hasAny(lower, FINANCIAL_KEYWORDS),
    hasScientificKeyword: hasAny(lower, SCIENTIFIC_KEYWORDS),
    hasMedicalKeyword: hasAny(lower, MEDICAL_KEYWORDS),
    hasCryptoKeyword: hasAny(lower, CRYPTO_KEYWORDS),
    hasLegalKeyword: hasAny(lower, LEGAL_KEYWORDS),
    hasNewsKeyword: hasAny(lower, NEWS_KEYWORDS),
  };
}
