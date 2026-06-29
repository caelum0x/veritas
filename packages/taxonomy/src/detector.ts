// Entity, number, and date detectors for lexical feature extraction in taxonomy classification.

/** A detected numeric value with its raw text and context. */
export interface DetectedNumber {
  readonly value: number;
  readonly raw: string;
  readonly unit: string | null;
  readonly index: number;
}

/** A detected date or temporal expression. */
export interface DetectedDate {
  readonly raw: string;
  readonly approximate: boolean;
  readonly index: number;
}

/** A detected named entity with type classification. */
export interface DetectedEntity {
  readonly text: string;
  readonly type: EntityType;
  readonly index: number;
}

/** High-level entity categories relevant to fact-checking. */
export type EntityType =
  | "person"
  | "organization"
  | "location"
  | "ticker"
  | "currency"
  | "percentage"
  | "law"
  | "drug"
  | "cryptocurrency"
  | "other";

/** Aggregated detector results for a text. */
export interface DetectorOutput {
  readonly numbers: readonly DetectedNumber[];
  readonly dates: readonly DetectedDate[];
  readonly entities: readonly DetectedEntity[];
  readonly hasNumbers: boolean;
  readonly hasDates: boolean;
  readonly hasEntities: boolean;
}

// ---------------------------------------------------------------------------
// Number detector
// ---------------------------------------------------------------------------

const NUMBER_RE =
  /(?<!\w)([-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)(%|bn|billion|mn|million|k|thousand|USD|USDC|BTC|ETH)?(?!\w)/gi;

const UNIT_ALIASES: Readonly<Record<string, string>> = {
  "%": "%",
  bn: "billion",
  billion: "billion",
  mn: "million",
  million: "million",
  k: "thousand",
  thousand: "thousand",
  usd: "USD",
  usdc: "USDC",
  btc: "BTC",
  eth: "ETH",
};

/** Extract numeric values (with optional units) from text. */
export function detectNumbers(text: string): readonly DetectedNumber[] {
  const results: DetectedNumber[] = [];
  let match: RegExpExecArray | null;
  NUMBER_RE.lastIndex = 0;
  while ((match = NUMBER_RE.exec(text)) !== null) {
    const raw = match[0];
    const numStr = (match[1] ?? match[0]).replace(/,/g, "");
    const value = parseFloat(numStr);
    if (isNaN(value)) continue;
    const rawUnit = match[2] ?? null;
    const unit = rawUnit ? (UNIT_ALIASES[rawUnit.toLowerCase()] ?? rawUnit) : null;
    results.push({ value, raw, unit, index: match.index });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Date detector
// ---------------------------------------------------------------------------

const FULL_DATE_RE =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}[\/\-]\d{2}[\/\-]\d{2}\b/gi;

const APPROX_DATE_RE =
  /\b(?:Q[1-4]\s+\d{4}|\d{4}s?|early|late|mid-?\d{4}s?|last\s+(?:year|month|week|quarter)|next\s+(?:year|month|week|quarter)|recently|yesterday|today|tomorrow)\b/gi;

/** Extract date and temporal expressions from text. */
export function detectDates(text: string): readonly DetectedDate[] {
  const results: DetectedDate[] = [];
  let match: RegExpExecArray | null;

  FULL_DATE_RE.lastIndex = 0;
  while ((match = FULL_DATE_RE.exec(text)) !== null) {
    results.push({ raw: match[0], approximate: false, index: match.index });
  }

  APPROX_DATE_RE.lastIndex = 0;
  while ((match = APPROX_DATE_RE.exec(text)) !== null) {
    results.push({ raw: match[0], approximate: true, index: match.index });
  }

  return results.sort((a, b) => a.index - b.index);
}

// ---------------------------------------------------------------------------
// Entity detector
// ---------------------------------------------------------------------------

/** Ticker symbols: 1-5 uppercase letters, optionally preceded by $. */
const TICKER_RE = /(?:^|\s)\$([A-Z]{1,5})\b|\b([A-Z]{2,5})\s*(?=stock|share|Corp|Inc|Ltd)/g;

/** Common cryptocurrency names/symbols. */
const CRYPTO_NAMES = new Set([
  "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "xrp", "ripple",
  "cardano", "ada", "polkadot", "dot", "avalanche", "avax", "chainlink",
  "link", "uniswap", "uni", "dogecoin", "doge", "litecoin", "ltc",
]);

/** Drug/pharmaceutical name heuristic (ends in common suffixes). */
const DRUG_SUFFIX_RE = /\b[A-Z][a-z]+(?:mab|nib|pib|zumab|kinase|statin|mycin|cillin|olol|sartan)\b/g;

/** US law / regulation patterns. */
const LAW_RE = /\b(?:Section\s+\d+|USC\s+§?\s*\d+|CFR\s+§?\s*\d+|Public\s+Law\s+\d+-\d+|GDPR|HIPAA|SOX|CCPA|AML|KYC)\b/g;

/** Currency amounts. */
const CURRENCY_RE = /\b(?:USD|EUR|GBP|JPY|CHF|CAD|AUD)\s*\d|\$\d|\€\d|\£\d/g;

function extractTickers(text: string): DetectedEntity[] {
  const results: DetectedEntity[] = [];
  let match: RegExpExecArray | null;
  TICKER_RE.lastIndex = 0;
  while ((match = TICKER_RE.exec(text)) !== null) {
    const sym = match[1] ?? match[2];
    if (sym) {
      results.push({ text: sym, type: "ticker", index: match.index });
    }
  }
  return results;
}

function extractCryptoEntities(text: string): DetectedEntity[] {
  const lower = text.toLowerCase();
  const results: DetectedEntity[] = [];
  for (const name of CRYPTO_NAMES) {
    let idx = lower.indexOf(name);
    while (idx !== -1) {
      results.push({
        text: text.slice(idx, idx + name.length),
        type: "cryptocurrency",
        index: idx,
      });
      idx = lower.indexOf(name, idx + 1);
    }
  }
  return results;
}

function extractWithRegex(
  text: string,
  re: RegExp,
  type: EntityType,
): DetectedEntity[] {
  const results: DetectedEntity[] = [];
  re.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    results.push({ text: match[0], type, index: match.index });
  }
  return results;
}

/** Detect named entities from text using pattern-based heuristics. */
export function detectEntities(text: string): readonly DetectedEntity[] {
  const all: DetectedEntity[] = [
    ...extractTickers(text),
    ...extractCryptoEntities(text),
    ...extractWithRegex(text, DRUG_SUFFIX_RE, "drug"),
    ...extractWithRegex(text, LAW_RE, "law"),
    ...extractWithRegex(text, CURRENCY_RE, "currency"),
  ];
  return all.sort((a, b) => a.index - b.index);
}

// ---------------------------------------------------------------------------
// Aggregate detector
// ---------------------------------------------------------------------------

/** Run all detectors on a text and return combined output. */
export function detect(text: string): DetectorOutput {
  const numbers = detectNumbers(text);
  const dates = detectDates(text);
  const entities = detectEntities(text);
  return {
    numbers,
    dates,
    entities,
    hasNumbers: numbers.length > 0,
    hasDates: dates.length > 0,
    hasEntities: entities.length > 0,
  };
}
