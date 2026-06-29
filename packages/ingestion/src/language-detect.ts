// Language detection port: detect the natural language of ingested text.

/** Port interface for a language detection backend. */
export interface LanguageDetectorPort {
  detect(text: string): Promise<string | null>;
}

/** Common BCP-47 language tags used in heuristic detection. */
const LANG_PATTERNS: ReadonlyArray<{ pattern: RegExp; lang: string }> = [
  { pattern: /\b(the|and|is|in|of|to|a|that|it|for)\b/gi, lang: "en" },
  { pattern: /\b(le|la|les|et|est|en|de|du|un|une)\b/gi, lang: "fr" },
  { pattern: /\b(der|die|das|und|ist|in|von|zu|ein|eine)\b/gi, lang: "de" },
  { pattern: /\b(el|la|los|las|y|es|en|de|un|una)\b/gi, lang: "es" },
  { pattern: /\b(il|lo|la|i|gli|le|e|è|in|di|un)\b/gi, lang: "it" },
  { pattern: /\b(o|a|os|as|e|é|em|de|um|uma)\b/gi, lang: "pt" },
  { pattern: /[一-鿿]/g, lang: "zh" },
  { pattern: /[぀-ヿ]/g, lang: "ja" },
  { pattern: /[가-힯]/g, lang: "ko" },
  { pattern: /[؀-ۿ]/g, lang: "ar" },
  { pattern: /[Ѐ-ӿ]/g, lang: "ru" },
];

/**
 * Heuristic in-memory language detector.
 * Scores text by counting pattern matches per language and returns the winner.
 */
export class HeuristicLanguageDetector implements LanguageDetectorPort {
  async detect(text: string): Promise<string | null> {
    if (text.trim().length < 10) return null;

    const scores = new Map<string, number>();

    for (const { pattern, lang } of LANG_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        scores.set(lang, (scores.get(lang) ?? 0) + matches.length);
      }
    }

    if (scores.size === 0) return null;

    let bestLang: string | null = null;
    let bestScore = 0;
    for (const [lang, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }

    return bestLang;
  }
}

/** Detect language of text using the provided detector port. */
export async function detectLanguage(
  text: string,
  detector: LanguageDetectorPort = new HeuristicLanguageDetector(),
): Promise<string | null> {
  return detector.detect(text);
}
