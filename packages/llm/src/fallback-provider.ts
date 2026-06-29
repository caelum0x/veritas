// Wraps a list of VerifierLLM providers with ordered refusal/error fallback
import { ok, err, isOk, type Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import { InternalError } from "@veritas/core";
import type {
  VerifierLLM,
  ExtractClaimsOptions,
  ResearchOptions,
  AdjudicateOptions,
  ExtractionResult,
} from "./provider.js";
import type { ResearchResult, ClaimAdjudication } from "./types.js";
import { LLMRefusalError, LLMUnavailableError } from "./errors.js";

/** Determines whether an error is retryable by trying the next provider */
function isTransientError(error: AppError): boolean {
  return (
    error instanceof LLMRefusalError || error instanceof LLMUnavailableError
  );
}

/**
 * FallbackProvider wraps an ordered list of providers and tries each in
 * sequence whenever the current one returns a refusal or transient error.
 * Hard errors (parse failures, rate limits) are returned immediately.
 */
export class FallbackProvider implements VerifierLLM {
  readonly name: string;

  constructor(
    private readonly providers: ReadonlyArray<VerifierLLM>,
    name = "fallback",
  ) {
    if (providers.length === 0) {
      throw new Error("FallbackProvider requires at least one provider");
    }
    this.name = name;
  }

  async extractClaims(
    documentText: string,
    options?: ExtractClaimsOptions,
  ): Promise<Result<ExtractionResult, AppError>> {
    return this.tryInOrder((p) => p.extractClaims(documentText, options));
  }

  async research(
    claimText: string,
    options?: ResearchOptions,
  ): Promise<Result<ResearchResult, AppError>> {
    return this.tryInOrder((p) => p.research(claimText, options));
  }

  async adjudicate(
    claimText: string,
    options?: AdjudicateOptions,
  ): Promise<Result<ClaimAdjudication, AppError>> {
    return this.tryInOrder((p) => p.adjudicate(claimText, options));
  }

  private async tryInOrder<T>(
    call: (provider: VerifierLLM) => Promise<Result<T, AppError>>,
  ): Promise<Result<T, AppError>> {
    let lastError: AppError = new InternalError({ message: "No providers available" });

    for (const provider of this.providers) {
      const result = await call(provider);
      if (isOk(result)) return result;

      const error = result.error;
      if (!isTransientError(error)) {
        // Non-transient: surface immediately, no point trying next provider
        return err(error);
      }
      lastError = error;
    }

    return err(lastError);
  }
}
