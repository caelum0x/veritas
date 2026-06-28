// Auto-tagger: applies PII, PHI, financial, and custom pattern-based tags to data fields

import { ok, err, type Result } from "@veritas/core";
import { type ClassificationLevel } from "./classification.js";
import { InvalidClassificationError } from "./errors.js";

export type TagPattern = {
  /** Tag name to apply when matched. */
  tag: string;
  /** Minimum classification level to enforce when this tag matches. */
  minLevel: ClassificationLevel;
  /** Matches by field name (case-insensitive substring). */
  fieldNamePattern?: RegExp;
  /** Matches by value pattern (only for string values). */
  valuePattern?: RegExp;
};

export type TagResult = {
  fieldName: string;
  tags: string[];
  /** Highest minimum level imposed by matched patterns. */
  enforcedMinLevel: ClassificationLevel | null;
};

const PII_PATTERNS: TagPattern[] = [
  { tag: "PII:email", minLevel: "confidential", fieldNamePattern: /email/i, valuePattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  { tag: "PII:ssn", minLevel: "restricted", fieldNamePattern: /ssn|social.?security/i, valuePattern: /^\d{3}-\d{2}-\d{4}$/ },
  { tag: "PII:phone", minLevel: "confidential", fieldNamePattern: /phone|mobile|cell/i },
  { tag: "PII:dob", minLevel: "confidential", fieldNamePattern: /dob|birth.?date|date.?of.?birth/i },
  { tag: "PII:name", minLevel: "internal", fieldNamePattern: /\bfirst.?name|last.?name|full.?name\b/i },
  { tag: "PII:address", minLevel: "confidential", fieldNamePattern: /address|street|zipcode|postal/i },
  { tag: "PII:ip", minLevel: "internal", fieldNamePattern: /ip.?address|remote.?ip/i },
];

const PHI_PATTERNS: TagPattern[] = [
  { tag: "PHI:diagnosis", minLevel: "restricted", fieldNamePattern: /diagnosis|icd.?code|medical.?condition/i },
  { tag: "PHI:medication", minLevel: "restricted", fieldNamePattern: /medication|prescription|drug.?name/i },
  { tag: "PHI:mrn", minLevel: "restricted", fieldNamePattern: /mrn|medical.?record.?number/i },
];

const FINANCIAL_PATTERNS: TagPattern[] = [
  { tag: "FIN:card", minLevel: "restricted", fieldNamePattern: /card.?number|pan|credit.?card/i, valuePattern: /^\d{13,19}$/ },
  { tag: "FIN:iban", minLevel: "restricted", fieldNamePattern: /iban/i },
  { tag: "FIN:routing", minLevel: "confidential", fieldNamePattern: /routing.?number|aba/i },
  { tag: "FIN:account", minLevel: "confidential", fieldNamePattern: /account.?number|bank.?account/i },
  { tag: "FIN:salary", minLevel: "confidential", fieldNamePattern: /salary|wage|compensation/i },
];

export const BUILTIN_PATTERNS: readonly TagPattern[] = [
  ...PII_PATTERNS,
  ...PHI_PATTERNS,
  ...FINANCIAL_PATTERNS,
];

/** Ordinal map for level comparison (duplicated locally to avoid circular deps). */
const LEVEL_ORD: Record<ClassificationLevel, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

function higherLevel(a: ClassificationLevel, b: ClassificationLevel): ClassificationLevel {
  return LEVEL_ORD[a] >= LEVEL_ORD[b] ? a : b;
}

/** Auto-tag a single field, returning matched tags and enforced minimum level. */
export function tagField(
  fieldName: string,
  value: unknown,
  patterns: readonly TagPattern[] = BUILTIN_PATTERNS,
): Result<TagResult, InvalidClassificationError> {
  try {
    const matchedTags: string[] = [];
    let enforcedMinLevel: ClassificationLevel | null = null;
    const strValue = typeof value === "string" ? value : undefined;

    for (const pattern of patterns) {
      const nameMatch = pattern.fieldNamePattern ? pattern.fieldNamePattern.test(fieldName) : true;
      const valueMatch = pattern.valuePattern
        ? strValue !== undefined && pattern.valuePattern.test(strValue)
        : true;

      if (nameMatch && valueMatch) {
        if (!matchedTags.includes(pattern.tag)) {
          matchedTags.push(pattern.tag);
        }
        enforcedMinLevel =
          enforcedMinLevel === null
            ? pattern.minLevel
            : higherLevel(enforcedMinLevel, pattern.minLevel);
      }
    }

    return ok({ fieldName, tags: matchedTags, enforcedMinLevel });
  } catch (e) {
    return err(new InvalidClassificationError(`Failed to tag field "${fieldName}": ${String(e)}`));
  }
}

/** Auto-tag all fields of a plain object, returning a map of field → TagResult. */
export function tagObject(
  obj: Record<string, unknown>,
  patterns: readonly TagPattern[] = BUILTIN_PATTERNS,
): Result<Map<string, TagResult>, InvalidClassificationError> {
  const results = new Map<string, TagResult>();

  for (const [key, value] of Object.entries(obj)) {
    const result = tagField(key, value, patterns);
    if (!result.ok) return result as Result<Map<string, TagResult>, InvalidClassificationError>;
    results.set(key, result.value);
  }

  return ok(results);
}
