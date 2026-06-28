// Cross-lingual verification: translate claims + evidence to a pivot language for comparison
import { ok, err, type Result, collect } from "@veritas/core";
import { type LanguageCode } from "./language.js";
import { type TranslatorPort, type TranslationRequest } from "./translator-port.js";
import { type MultilingualError, crossLingualError } from "./errors.js";
import { detectLanguageCode } from "./detector.js";

/** A claim that may be in any supported language */
export interface MultilingualClaim {
  readonly text: string;
  readonly language?: LanguageCode;
}

/** Evidence fragment potentially in a different language than the claim */
export interface MultilingualEvidence {
  readonly id: string;
  readonly text: string;
  readonly language?: LanguageCode;
  readonly sourceUrl?: string;
}

/** Normalised claim + evidence all in the pivot language */
export interface CrossLingualNormalized {
  readonly pivotLanguage: LanguageCode;
  readonly originalClaimLanguage: LanguageCode;
  readonly claimText: string;
  readonly evidenceItems: ReadonlyArray<{ id: string; text: string; originalLanguage: LanguageCode }>;
  readonly translationsPerformed: number;
}

export interface CrossLingualVerifierOptions {
  /** Pivot language for comparison (default: "en") */
  readonly pivotLanguage?: LanguageCode;
  /** Skip translation when text is already in pivot language */
  readonly skipIfAlreadyPivot?: boolean;
  /** Domain hint forwarded to translator */
  readonly domain?: TranslationRequest["domain"];
}

/** Translate a single text to pivot if needed; returns original if already pivot */
async function maybePivot(
  text: string,
  detectedLang: LanguageCode,
  pivot: LanguageCode,
  translator: TranslatorPort,
  domain: TranslationRequest["domain"],
): Promise<Result<{ text: string; translated: boolean }, MultilingualError>> {
  if (detectedLang === pivot) {
    return ok({ text, translated: false });
  }
  const req: TranslationRequest = {
    text,
    sourceLanguage: detectedLang,
    targetLanguage: pivot,
    preserveFormatting: false,
    domain,
  };
  const result = await translator.translate(req);
  if (!result.ok) return result;
  return ok({ text: result.value.translatedText, translated: true });
}

/** Normalise a multilingual claim + evidence set into a single pivot language */
export async function normalizeToPivot(
  claim: MultilingualClaim,
  evidence: ReadonlyArray<MultilingualEvidence>,
  translator: TranslatorPort,
  options: CrossLingualVerifierOptions = {},
): Promise<Result<CrossLingualNormalized, MultilingualError>> {
  const pivot: LanguageCode = options.pivotLanguage ?? ("en" as LanguageCode);
  const domain: TranslationRequest["domain"] = options.domain ?? "general";

  const claimLang: LanguageCode = claim.language ?? detectLanguageCode(claim.text);

  const claimPivotResult = await maybePivot(claim.text, claimLang, pivot, translator, domain);
  if (!claimPivotResult.ok) {
    return err(crossLingualError(`Failed to translate claim: ${claimPivotResult.error.message}`, claimPivotResult.error));
  }

  let translationsPerformed = claimPivotResult.value.translated ? 1 : 0;

  const evidenceResults = await Promise.all(
    evidence.map(async (ev) => {
      const evLang: LanguageCode = ev.language ?? detectLanguageCode(ev.text);
      const pivotResult = await maybePivot(ev.text, evLang, pivot, translator, domain);
      return { ev, evLang, pivotResult };
    }),
  );

  const errors = evidenceResults.filter((r) => !r.pivotResult.ok);
  if (errors.length > 0) {
    const first = errors[0]!;
    return err(
      crossLingualError(
        `Failed to translate evidence ${first.ev.id}: ${!first.pivotResult.ok ? first.pivotResult.error.message : "unknown"}`,
      ),
    );
  }

  const pivotedEvidence = evidenceResults.map(({ ev, evLang, pivotResult }) => {
    if (!pivotResult.ok) throw new Error("unreachable");
    if (pivotResult.value.translated) translationsPerformed++;
    return { id: ev.id, text: pivotResult.value.text, originalLanguage: evLang };
  });

  return ok({
    pivotLanguage: pivot,
    originalClaimLanguage: claimLang,
    claimText: claimPivotResult.value.text,
    evidenceItems: pivotedEvidence,
    translationsPerformed,
  });
}

/** Extract unique languages referenced across claim and evidence */
export function collectLanguages(
  claim: MultilingualClaim,
  evidence: ReadonlyArray<MultilingualEvidence>,
): ReadonlyArray<LanguageCode> {
  const langs = new Set<LanguageCode>();
  langs.add(claim.language ?? detectLanguageCode(claim.text));
  for (const ev of evidence) {
    langs.add(ev.language ?? detectLanguageCode(ev.text));
  }
  return [...langs];
}
