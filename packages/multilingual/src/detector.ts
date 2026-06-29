// Language detection using Unicode script heuristics and trigram scoring
import { type Result, ok, err } from "@veritas/core";
import { type LanguageCode, UNKNOWN_LANGUAGE, isSupportedLanguage } from "./language.js";
import { type MultilingualError, detectionError } from "./errors.js";

export interface DetectionResult {
  readonly language: LanguageCode;
  readonly confidence: number;
  readonly alternatives: ReadonlyArray<{ language: LanguageCode; confidence: number }>;
}

/** Script range checks for fast heuristic detection */
const SCRIPT_PATTERNS: ReadonlyArray<{ pattern: RegExp; languages: ReadonlyArray<LanguageCode> }> = [
  { pattern: /[一-鿿㐀-䶿]/, languages: ["zh", "ja"] as LanguageCode[] },
  { pattern: /[぀-ゟ゠-ヿ]/, languages: ["ja"] as LanguageCode[] },
  { pattern: /[가-힯]/, languages: ["ko"] as LanguageCode[] },
  { pattern: /[؀-ۿ]/, languages: ["ar", "fa"] as LanguageCode[] },
  { pattern: /[֐-׿]/, languages: ["he"] as LanguageCode[] },
  { pattern: /[ऀ-ॿ]/, languages: ["hi"] as LanguageCode[] },
  { pattern: /[Ѐ-ӿ]/, languages: ["ru", "uk"] as LanguageCode[] },
];

/** Common word lists for Latin-script disambiguation */
const WORD_HINTS: ReadonlyMap<LanguageCode, ReadonlyArray<string>> = new Map([
  ["en" as LanguageCode, ["the", "is", "are", "was", "were", "have", "has", "been", "and", "that", "with"]],
  ["es" as LanguageCode, ["el", "la", "los", "las", "es", "son", "del", "que", "por", "con", "una"]],
  ["fr" as LanguageCode, ["le", "la", "les", "est", "sont", "des", "que", "une", "dans", "pour"]],
  ["de" as LanguageCode, ["der", "die", "das", "ist", "sind", "ein", "eine", "und", "mit", "für"]],
  ["it" as LanguageCode, ["il", "lo", "la", "gli", "le", "è", "sono", "che", "per", "con", "una"]],
  ["pt" as LanguageCode, ["o", "a", "os", "as", "é", "são", "do", "da", "que", "com", "uma"]],
  ["nl" as LanguageCode, ["de", "het", "een", "is", "zijn", "van", "in", "op", "met", "voor"]],
  ["tr" as LanguageCode, ["bir", "ve", "bu", "da", "de", "için", "olan", "ile", "çok", "gibi"]],
  ["pl" as LanguageCode, ["i", "w", "się", "nie", "to", "na", "do", "że", "jest", "ale"]],
  ["sv" as LanguageCode, ["och", "är", "att", "det", "en", "ett", "av", "för", "på", "med"]],
  ["vi" as LanguageCode, ["và", "của", "trong", "là", "có", "được", "những", "với", "này", "các"]],
]);

/** Detect language from text using script heuristics and word frequency */
function detectFromText(text: string): DetectionResult {
  const normalised = text.toLowerCase().trim();
  if (normalised.length === 0) {
    return { language: UNKNOWN_LANGUAGE, confidence: 0, alternatives: [] };
  }

  // Script-based detection (fast path)
  for (const { pattern, languages } of SCRIPT_PATTERNS) {
    if (pattern.test(normalised)) {
      const primary = languages[0] as LanguageCode;
      const alternatives = languages.slice(1).map((l) => ({ language: l as LanguageCode, confidence: 0.4 }));
      return { language: primary, confidence: 0.85, alternatives };
    }
  }

  // Word-hint scoring for Latin scripts
  const words = new Set(normalised.match(/\b\w+\b/g) ?? []);
  const scores = new Map<LanguageCode, number>();

  for (const [lang, hints] of WORD_HINTS) {
    const matches = hints.filter((w) => words.has(w)).length;
    if (matches > 0) {
      scores.set(lang, matches / hints.length);
    }
  }

  if (scores.size === 0) {
    return { language: "en" as LanguageCode, confidence: 0.3, alternatives: [] };
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [top, ...rest] = sorted;
  const [topLang, topScore] = top as [LanguageCode, number];
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  const confidence = Math.min(0.95, topScore / total + 0.1);

  const alternatives = rest
    .slice(0, 3)
    .map(([language, score]) => ({ language, confidence: Math.min(0.9, score / total) }));

  return { language: topLang as LanguageCode, confidence, alternatives };
}

/** Public detector with Result wrapping */
export function detectLanguage(text: string): Result<DetectionResult, MultilingualError> {
  if (typeof text !== "string") {
    return err(detectionError("Input must be a string"));
  }
  try {
    const result = detectFromText(text);
    return ok(result);
  } catch (e) {
    return err(detectionError(`Detection failed: ${e instanceof Error ? e.message : String(e)}`));
  }
}

/** Detect with a minimum confidence threshold; returns UNKNOWN if below threshold */
export function detectLanguageWithThreshold(
  text: string,
  minConfidence = 0.6,
): Result<DetectionResult, MultilingualError> {
  const result = detectLanguage(text);
  if (!result.ok) return result;
  if (result.value.confidence < minConfidence) {
    return ok({ language: UNKNOWN_LANGUAGE, confidence: result.value.confidence, alternatives: result.value.alternatives });
  }
  return result;
}

/** Synchronously detect and return the language code or UNKNOWN */
export function detectLanguageCode(text: string): LanguageCode {
  const result = detectLanguage(text);
  if (!result.ok) return UNKNOWN_LANGUAGE;
  return result.value.language;
}
