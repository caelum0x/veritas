// Language codes and metadata for multilingual verification support
import { z } from "zod";

/** ISO 639-1 two-letter language code */
export const LanguageCodeSchema = z.string().length(2).toLowerCase();
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

/** BCP 47 locale tag (e.g. "en-US", "zh-Hans-CN") */
export const LocaleTagSchema = z.string().regex(/^[a-z]{2,3}(-[A-Za-z]{2,4})*$/);
export type LocaleTag = z.infer<typeof LocaleTagSchema>;

export interface LanguageMeta {
  readonly code: LanguageCode;
  readonly name: string;
  readonly nativeName: string;
  readonly script: string;
  readonly rtl: boolean;
}

/** Supported languages with metadata */
export const SUPPORTED_LANGUAGES: ReadonlyMap<LanguageCode, LanguageMeta> = new Map([
  ["en", { code: "en", name: "English", nativeName: "English", script: "Latin", rtl: false }],
  ["es", { code: "es", name: "Spanish", nativeName: "Español", script: "Latin", rtl: false }],
  ["fr", { code: "fr", name: "French", nativeName: "Français", script: "Latin", rtl: false }],
  ["de", { code: "de", name: "German", nativeName: "Deutsch", script: "Latin", rtl: false }],
  ["it", { code: "it", name: "Italian", nativeName: "Italiano", script: "Latin", rtl: false }],
  ["pt", { code: "pt", name: "Portuguese", nativeName: "Português", script: "Latin", rtl: false }],
  ["nl", { code: "nl", name: "Dutch", nativeName: "Nederlands", script: "Latin", rtl: false }],
  ["ru", { code: "ru", name: "Russian", nativeName: "Русский", script: "Cyrillic", rtl: false }],
  ["zh", { code: "zh", name: "Chinese", nativeName: "中文", script: "Han", rtl: false }],
  ["ja", { code: "ja", name: "Japanese", nativeName: "日本語", script: "Mixed", rtl: false }],
  ["ko", { code: "ko", name: "Korean", nativeName: "한국어", script: "Hangul", rtl: false }],
  ["ar", { code: "ar", name: "Arabic", nativeName: "العربية", script: "Arabic", rtl: true }],
  ["hi", { code: "hi", name: "Hindi", nativeName: "हिन्दी", script: "Devanagari", rtl: false }],
  ["tr", { code: "tr", name: "Turkish", nativeName: "Türkçe", script: "Latin", rtl: false }],
  ["pl", { code: "pl", name: "Polish", nativeName: "Polski", script: "Latin", rtl: false }],
  ["sv", { code: "sv", name: "Swedish", nativeName: "Svenska", script: "Latin", rtl: false }],
  ["fa", { code: "fa", name: "Persian", nativeName: "فارسی", script: "Arabic", rtl: true }],
  ["he", { code: "he", name: "Hebrew", nativeName: "עברית", script: "Hebrew", rtl: true }],
  ["uk", { code: "uk", name: "Ukrainian", nativeName: "Українська", script: "Cyrillic", rtl: false }],
  ["vi", { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", script: "Latin", rtl: false }],
]);

export const UNKNOWN_LANGUAGE: LanguageCode = "xx" as LanguageCode;

/** Returns language metadata or undefined for unknown codes */
export function getLanguageMeta(code: LanguageCode): LanguageMeta | undefined {
  return SUPPORTED_LANGUAGES.get(code);
}

/** Returns true if the language code is supported */
export function isSupportedLanguage(code: string): code is LanguageCode {
  return SUPPORTED_LANGUAGES.has(code as LanguageCode);
}

/** Returns true if the language is right-to-left */
export function isRtl(code: LanguageCode): boolean {
  return SUPPORTED_LANGUAGES.get(code)?.rtl ?? false;
}
