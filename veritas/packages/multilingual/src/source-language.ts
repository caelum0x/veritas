// Source-language matching: determine if a source's language fits a claim's language context

import { parseLocale, sameLanguage } from "./locale.js";
import { detectScript } from "./script.js";

export interface LanguageMatch {
  readonly exact: boolean;
  readonly languageMatch: boolean;
  readonly scriptMatch: boolean;
  readonly score: number; // 0.0–1.0
}

export interface SourceLanguageProfile {
  readonly locale: string;
  readonly scriptCode?: string;
  readonly confidence: number; // 0.0–1.0
}

/** Score how well a source's language matches the target language context */
export function matchSourceLanguage(
  sourceProfile: SourceLanguageProfile,
  targetLocale: string
): LanguageMatch {
  const sourceParts = parseLocale(sourceProfile.locale);
  const targetParts = parseLocale(targetLocale);

  if (!sourceParts || !targetParts) {
    return { exact: false, languageMatch: false, scriptMatch: false, score: 0 };
  }

  const exact = sourceProfile.locale === targetLocale;
  const languageMatch = sameLanguage(sourceProfile.locale, targetLocale);
  const scriptMatch = sourceParts.script === targetParts.script;

  let score = 0;
  if (exact) {
    score = 1.0;
  } else if (languageMatch && scriptMatch) {
    score = 0.9;
  } else if (languageMatch) {
    score = 0.75;
  } else if (scriptMatch) {
    score = 0.3;
  }

  // Apply source confidence weight
  score = score * sourceProfile.confidence;

  return { exact, languageMatch, scriptMatch, score };
}

/** Filter and rank sources by language compatibility with a target locale */
export function rankSourcesByLanguage(
  sources: ReadonlyArray<SourceLanguageProfile & { readonly id: string }>,
  targetLocale: string,
  minScore = 0.5
): ReadonlyArray<{ readonly id: string; readonly match: LanguageMatch }> {
  return sources
    .map((src) => ({ id: src.id, match: matchSourceLanguage(src, targetLocale) }))
    .filter((r) => r.match.score >= minScore)
    .sort((a, b) => b.match.score - a.match.score);
}

/** Infer a language profile from raw text using heuristic script detection */
export function inferLanguageProfile(text: string, fallbackLocale = "en"): SourceLanguageProfile {
  const scriptCode = detectScript(text);

  const scriptToLocale: ReadonlyRecord<string, string> = {
    Latn: fallbackLocale,
    Cyrl: "ru",
    Arab: "ar",
    Hebr: "he",
    Hans: "zh-Hans",
    Hant: "zh-Hant",
    Jpan: "ja",
    Kore: "ko",
    Deva: "hi",
    Thai: "th",
    Grek: "el",
    Geor: "ka",
    Armn: "hy",
    Ethi: "am",
    Tibt: "bo",
  };

  const locale = scriptToLocale[scriptCode] ?? fallbackLocale;
  const confidence = scriptCode === "Zyyy" ? 0.3 : 0.6;

  return { locale, scriptCode, confidence };
}

type ReadonlyRecord<K extends string, V> = { readonly [P in K]: V };

/** Check whether a set of sources provides sufficient language coverage for a locale */
export function hasSufficientLanguageCoverage(
  sources: ReadonlyArray<SourceLanguageProfile & { readonly id: string }>,
  targetLocale: string,
  minMatchScore = 0.7,
  minSourceCount = 1
): boolean {
  const ranked = rankSourcesByLanguage(sources, targetLocale, minMatchScore);
  return ranked.length >= minSourceCount;
}
