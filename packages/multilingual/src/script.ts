// Script (writing system) detection and classification for multilingual text

export type ScriptCode =
  | "Latn"   // Latin
  | "Cyrl"   // Cyrillic
  | "Arab"   // Arabic
  | "Hebr"   // Hebrew
  | "Hans"   // Han Simplified
  | "Hant"   // Han Traditional
  | "Jpan"   // Japanese (Hiragana/Katakana/Kanji)
  | "Kore"   // Korean (Hangul)
  | "Deva"   // Devanagari
  | "Thai"   // Thai
  | "Grek"   // Greek
  | "Geor"   // Georgian
  | "Armn"   // Armenian
  | "Ethi"   // Ethiopic
  | "Tibt"   // Tibetan
  | "Sinh"   // Sinhala
  | "Beng"   // Bengali
  | "Gujr"   // Gujarati
  | "Guru"   // Gurmukhi
  | "Knda"   // Kannada
  | "Mlym"   // Malayalam
  | "Orya"   // Oriya
  | "Taml"   // Tamil
  | "Telu"   // Telugu
  | "Zyyy"   // Common/undetermined
  | "Zzzz";  // Unknown

export interface ScriptInfo {
  readonly code: ScriptCode;
  readonly name: string;
  readonly direction: "ltr" | "rtl" | "ttb" | "mixed";
  readonly isRtl: boolean;
}

const SCRIPT_REGISTRY: ReadonlyMap<ScriptCode, ScriptInfo> = new Map([
  ["Latn", { code: "Latn", name: "Latin", direction: "ltr", isRtl: false }],
  ["Cyrl", { code: "Cyrl", name: "Cyrillic", direction: "ltr", isRtl: false }],
  ["Arab", { code: "Arab", name: "Arabic", direction: "rtl", isRtl: true }],
  ["Hebr", { code: "Hebr", name: "Hebrew", direction: "rtl", isRtl: true }],
  ["Hans", { code: "Hans", name: "Han Simplified", direction: "ltr", isRtl: false }],
  ["Hant", { code: "Hant", name: "Han Traditional", direction: "ltr", isRtl: false }],
  ["Jpan", { code: "Jpan", name: "Japanese", direction: "ltr", isRtl: false }],
  ["Kore", { code: "Kore", name: "Korean", direction: "ltr", isRtl: false }],
  ["Deva", { code: "Deva", name: "Devanagari", direction: "ltr", isRtl: false }],
  ["Thai", { code: "Thai", name: "Thai", direction: "ltr", isRtl: false }],
  ["Grek", { code: "Grek", name: "Greek", direction: "ltr", isRtl: false }],
  ["Geor", { code: "Geor", name: "Georgian", direction: "ltr", isRtl: false }],
  ["Armn", { code: "Armn", name: "Armenian", direction: "ltr", isRtl: false }],
  ["Ethi", { code: "Ethi", name: "Ethiopic", direction: "ltr", isRtl: false }],
  ["Tibt", { code: "Tibt", name: "Tibetan", direction: "ltr", isRtl: false }],
  ["Sinh", { code: "Sinh", name: "Sinhala", direction: "ltr", isRtl: false }],
  ["Beng", { code: "Beng", name: "Bengali", direction: "ltr", isRtl: false }],
  ["Gujr", { code: "Gujr", name: "Gujarati", direction: "ltr", isRtl: false }],
  ["Guru", { code: "Guru", name: "Gurmukhi", direction: "ltr", isRtl: false }],
  ["Knda", { code: "Knda", name: "Kannada", direction: "ltr", isRtl: false }],
  ["Mlym", { code: "Mlym", name: "Malayalam", direction: "ltr", isRtl: false }],
  ["Orya", { code: "Orya", name: "Oriya", direction: "ltr", isRtl: false }],
  ["Taml", { code: "Taml", name: "Tamil", direction: "ltr", isRtl: false }],
  ["Telu", { code: "Telu", name: "Telugu", direction: "ltr", isRtl: false }],
  ["Zyyy", { code: "Zyyy", name: "Common", direction: "ltr", isRtl: false }],
  ["Zzzz", { code: "Zzzz", name: "Unknown", direction: "ltr", isRtl: false }],
]);

/** Detect dominant script from a text sample using Unicode block ranges */
export function detectScript(text: string): ScriptCode {
  const counts = new Map<ScriptCode, number>();

  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    const script = charScript(cp);
    if (script !== "Zyyy") {
      counts.set(script, (counts.get(script) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return "Zyyy";

  let dominant: ScriptCode = "Zyyy";
  let max = 0;
  for (const [script, count] of counts) {
    if (count > max) {
      max = count;
      dominant = script;
    }
  }
  return dominant;
}

/** Get script info by code */
export function getScriptInfo(code: ScriptCode): ScriptInfo {
  return SCRIPT_REGISTRY.get(code) ?? { code: "Zzzz", name: "Unknown", direction: "ltr", isRtl: false };
}

/** Check if script is right-to-left */
export function isRtlScript(code: ScriptCode): boolean {
  return getScriptInfo(code).isRtl;
}

/** Detect if a text is right-to-left */
export function isRtlText(text: string): boolean {
  return isRtlScript(detectScript(text));
}

function charScript(cp: number): ScriptCode {
  if (cp >= 0x0041 && cp <= 0x007A) return "Latn"; // Basic Latin A-Z a-z
  if (cp >= 0x00C0 && cp <= 0x024F) return "Latn"; // Latin Extended
  if (cp >= 0x0400 && cp <= 0x04FF) return "Cyrl"; // Cyrillic
  if (cp >= 0x0600 && cp <= 0x06FF) return "Arab"; // Arabic
  if (cp >= 0x0750 && cp <= 0x077F) return "Arab"; // Arabic Supplement
  if (cp >= 0x0590 && cp <= 0x05FF) return "Hebr"; // Hebrew
  if (cp >= 0x0900 && cp <= 0x097F) return "Deva"; // Devanagari
  if (cp >= 0x0980 && cp <= 0x09FF) return "Beng"; // Bengali
  if (cp >= 0x0A00 && cp <= 0x0A7F) return "Guru"; // Gurmukhi
  if (cp >= 0x0A80 && cp <= 0x0AFF) return "Gujr"; // Gujarati
  if (cp >= 0x0B00 && cp <= 0x0B7F) return "Orya"; // Oriya
  if (cp >= 0x0B80 && cp <= 0x0BFF) return "Taml"; // Tamil
  if (cp >= 0x0C00 && cp <= 0x0C7F) return "Telu"; // Telugu
  if (cp >= 0x0C80 && cp <= 0x0CFF) return "Knda"; // Kannada
  if (cp >= 0x0D00 && cp <= 0x0D7F) return "Mlym"; // Malayalam
  if (cp >= 0x0D80 && cp <= 0x0DFF) return "Sinh"; // Sinhala
  if (cp >= 0x0E00 && cp <= 0x0E7F) return "Thai"; // Thai
  if (cp >= 0x0F00 && cp <= 0x0FFF) return "Tibt"; // Tibetan
  if (cp >= 0x10A0 && cp <= 0x10FF) return "Geor"; // Georgian
  if (cp >= 0x0370 && cp <= 0x03FF) return "Grek"; // Greek
  if (cp >= 0x0530 && cp <= 0x058F) return "Armn"; // Armenian
  if (cp >= 0x1200 && cp <= 0x137F) return "Ethi"; // Ethiopic
  if (cp >= 0x1100 && cp <= 0x11FF) return "Kore"; // Hangul Jamo
  if (cp >= 0xAC00 && cp <= 0xD7AF) return "Kore"; // Hangul Syllables
  if (cp >= 0x3040 && cp <= 0x30FF) return "Jpan"; // Hiragana/Katakana
  if (cp >= 0x4E00 && cp <= 0x9FFF) return "Hans"; // CJK Unified Ideographs
  if (cp >= 0x3400 && cp <= 0x4DBF) return "Hans"; // CJK Extension A
  if (cp >= 0xF900 && cp <= 0xFAFF) return "Hans"; // CJK Compatibility Ideographs
  return "Zyyy";
}
