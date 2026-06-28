// Adapts any vendor SDK call signature into the VerifierLLM port interface
import { ok, err, tryAsync } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import { LLMUnavailableError, LLMRateLimitError, LLMRefusalError } from "@veritas/llm";
import type {
  VerifierLLM,
  ExtractClaimsOptions,
  ResearchOptions,
  AdjudicateOptions,
  ExtractionResult,
} from "@veritas/llm";
import type { ResearchResult, ClaimAdjudication } from "@veritas/llm";

/** Raw vendor SDK function shapes that adapters must supply */
export interface VendorExtractFn {
  (text: string, opts: ExtractClaimsOptions): Promise<ExtractionResult>;
}

export interface VendorResearchFn {
  (claim: string, opts: ResearchOptions): Promise<ResearchResult>;
}

export interface VendorAdjudicateFn {
  (claim: string, opts: AdjudicateOptions): Promise<ClaimAdjudication>;
}

export interface VendorFunctions {
  readonly extract: VendorExtractFn;
  readonly research: VendorResearchFn;
  readonly adjudicate: VendorAdjudicateFn;
}

/** Classifies a raw SDK error into the correct LLM error subtype */
function classifyError(providerName: string, cause: unknown): AppError {
  if (cause instanceof Error) {
    const msg = cause.message.toLowerCase();
    if (msg.includes("rate") || msg.includes("429")) {
      return new LLMRateLimitError(cause.message, 5000, cause);
    }
    if (msg.includes("refus") || msg.includes("content") || msg.includes("block")) {
      return new LLMRefusalError(cause.message, providerName, cause);
    }
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return new LLMUnavailableError(message, providerName, cause);
}

/**
 * Wraps three raw vendor functions into the VerifierLLM interface.
 * All errors from the vendor are classified and wrapped as typed AppError.
 */
export function createProviderAdapter(
  name: string,
  fns: VendorFunctions,
): VerifierLLM {
  return {
    name,

    async extractClaims(
      documentText: string,
      options: ExtractClaimsOptions = {},
    ): Promise<Result<ExtractionResult, AppError>> {
      const result = await tryAsync(() => fns.extract(documentText, options));
      if (result.ok) return ok(result.value);
      return err(classifyError(name, result.error));
    },

    async research(
      claimText: string,
      options: ResearchOptions = {},
    ): Promise<Result<ResearchResult, AppError>> {
      const result = await tryAsync(() => fns.research(claimText, options));
      if (result.ok) return ok(result.value);
      return err(classifyError(name, result.error));
    },

    async adjudicate(
      claimText: string,
      options: AdjudicateOptions = {},
    ): Promise<Result<ClaimAdjudication, AppError>> {
      const result = await tryAsync(() => fns.adjudicate(claimText, options));
      if (result.ok) return ok(result.value);
      return err(classifyError(name, result.error));
    },
  };
}
