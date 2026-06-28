// Ordered failover across multiple VerifierLLM providers with configurable retry policy
import { ok, err, isOk, type Result } from "@veritas/core";
import { InternalError, type AppError } from "@veritas/core";
import type {
  VerifierLLM,
  ExtractClaimsOptions,
  ResearchOptions,
  AdjudicateOptions,
  ExtractionResult,
} from "@veritas/llm";
import { LLMRefusalError, LLMUnavailableError } from "@veritas/llm";
import type { ResearchResult, ClaimAdjudication } from "@veritas/llm";

/** Controls which error kinds trigger failover to the next provider */
export interface FailoverPolicy {
  /** Fail over on refusals (content-policy blocks). Default: true */
  readonly onRefusal: boolean;
  /** Fail over on upstream unavailability. Default: true */
  readonly onUnavailable: boolean;
}

const DEFAULT_POLICY: FailoverPolicy = { onRefusal: true, onUnavailable: true };

function shouldFailover(error: AppError, policy: FailoverPolicy): boolean {
  if (policy.onRefusal && error instanceof LLMRefusalError) return true;
  if (policy.onUnavailable && error instanceof LLMUnavailableError) return true;
  return false;
}

/**
 * FailoverLLM wraps an ordered list of VerifierLLM providers and delegates to the
 * next provider whenever the active one returns a failover-eligible error.
 * Non-transient errors (parse failures, rate limits) surface immediately.
 */
export class FailoverLLM implements VerifierLLM {
  readonly name: string;
  private readonly policy: FailoverPolicy;

  constructor(
    private readonly providers: ReadonlyArray<VerifierLLM>,
    name = "failover",
    policy: Partial<FailoverPolicy> = {},
  ) {
    if (providers.length === 0) {
      throw new Error("FailoverLLM requires at least one provider");
    }
    this.name = name;
    this.policy = { ...DEFAULT_POLICY, ...policy };
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
      if (!shouldFailover(error, this.policy)) {
        return err(error);
      }
      lastError = error;
    }

    return err(lastError);
  }

  /** Return the ordered list of backing providers */
  get backingProviders(): ReadonlyArray<VerifierLLM> {
    return this.providers;
  }
}
