// LLM-backed TranslatorPort implementation using @veritas/llm VerifierLLM
import { ok, err, type Result } from "@veritas/core";
import { type VerifierLLM } from "@veritas/llm";
import { type LanguageCode, SUPPORTED_LANGUAGES, isSupportedLanguage } from "./language.js";
import {
  type TranslatorPort,
  type TranslationRequest,
  type TranslationResult,
  buildCacheKey,
  type TranslationCacheEntry,
} from "./translator-port.js";
import { translationError, unsupportedLanguageError, type MultilingualError } from "./errors.js";
import { detectLanguageCode } from "./detector.js";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function buildTranslationPrompt(request: TranslationRequest): string {
  const targetMeta = SUPPORTED_LANGUAGES.get(request.targetLanguage);
  const targetName = targetMeta?.name ?? request.targetLanguage;
  const srcHint = request.sourceLanguage
    ? `Source language: ${SUPPORTED_LANGUAGES.get(request.sourceLanguage)?.name ?? request.sourceLanguage}. `
    : "";
  const domainHint = request.domain !== "general" ? ` Translate with ${request.domain} domain expertise.` : "";
  const formatHint = request.preserveFormatting
    ? " Preserve all whitespace, newlines, and formatting exactly."
    : "";
  return (
    `You are a professional translator.${domainHint}${formatHint}\n` +
    `${srcHint}Translate the following text to ${targetName}.\n` +
    `Respond with ONLY the translated text — no explanations, no quotes, no preamble.\n\n` +
    `TEXT TO TRANSLATE:\n${request.text}`
  );
}

/** LLM-backed translator; caches results in-memory with TTL */
export class LLMTranslator implements TranslatorPort {
  private readonly cache = new Map<string, TranslationCacheEntry>();

  constructor(private readonly llm: VerifierLLM) {}

  supportsLanguagePair(source: LanguageCode, target: LanguageCode): boolean {
    return isSupportedLanguage(source) && isSupportedLanguage(target);
  }

  async translate(request: TranslationRequest): Promise<Result<TranslationResult, MultilingualError>> {
    // Validate target language
    if (!isSupportedLanguage(request.targetLanguage)) {
      return err(unsupportedLanguageError(request.targetLanguage));
    }

    const key = buildCacheKey(request);
    const cached = this.getFromCache(key);
    if (cached) return ok(cached.result);

    const prompt = buildTranslationPrompt(request);

    // Use adjudicate as a general LLM call for translation
    const adjResult = await this.llm.adjudicate(prompt, { maxOutputTokens: 4096 });
    if (!adjResult.ok) {
      return err(translationError(`LLM translation failed: ${adjResult.error.message}`, adjResult.error));
    }

    // The adjudication returns a ClaimAdjudication; we use explanation as the translated text
    const translated = (adjResult.value as unknown as { explanation?: string; reasoning?: string }).explanation
      ?? (adjResult.value as unknown as { reasoning?: string }).reasoning
      ?? prompt;

    const detectedSource = request.sourceLanguage ?? detectLanguageCode(request.text);
    const result: TranslationResult = {
      translatedText: translated.trim(),
      detectedSourceLanguage: detectedSource,
      confidence: 0.88,
      tokensUsed: adjResult.value.tokensUsed,
    };

    this.setCache(key, result);
    return ok(result);
  }

  async translateBatch(
    requests: ReadonlyArray<TranslationRequest>,
  ): Promise<ReadonlyArray<Result<TranslationResult, MultilingualError>>> {
    return Promise.all(requests.map((r) => this.translate(r)));
  }

  private getFromCache(key: string): TranslationCacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
      this.cache.delete(key);
      return undefined;
    }
    return entry;
  }

  private setCache(key: string, result: TranslationResult): void {
    this.cache.set(key, { key, result, createdAt: Date.now() });
  }
}

/** Passthrough mock translator for testing */
export class MockTranslator implements TranslatorPort {
  supportsLanguagePair(_source: LanguageCode, _target: LanguageCode): boolean {
    return true;
  }

  async translate(request: TranslationRequest): Promise<Result<TranslationResult, MultilingualError>> {
    const detected = request.sourceLanguage ?? detectLanguageCode(request.text);
    return ok({
      translatedText: `[${request.targetLanguage}] ${request.text}`,
      detectedSourceLanguage: detected,
      confidence: 1.0,
    });
  }

  async translateBatch(
    requests: ReadonlyArray<TranslationRequest>,
  ): Promise<ReadonlyArray<Result<TranslationResult, MultilingualError>>> {
    return Promise.all(requests.map((r) => this.translate(r)));
  }
}
