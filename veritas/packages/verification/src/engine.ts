// runVerification: orchestrates the full verification pipeline end-to-end.

import {
  ok,
  err,
  isErr,
  noopLogger,
  newVerificationId,
  epochToIso,
  ValidationError,
  InternalError,
} from "@veritas/core";
import type { Result, AppError, Logger } from "@veritas/core";
import { VerificationRequestSchema } from "@veritas/contracts";
import type { VerificationRequest, VerificationReport } from "@veritas/contracts";
import type { EngineOptions } from "./engine-options.js";
import { composePipeline } from "./pipeline/pipeline.js";
import type { VerificationContext } from "./pipeline/context.js";
import { makeStage } from "./pipeline/stage.js";
import { normalizeStage } from "./stages/normalize.js";
import { resolveClaimsStage } from "./stages/resolve-claims.js";
import { dedupeClaimsStage } from "./stages/dedupe-claims.js";
import { scoreStage } from "./stages/score.js";
import { assembleStage } from "./stages/assemble.js";

/** Output of a successful verification run. */
export interface VerificationResult {
  readonly report: VerificationReport;
  readonly totalTokensUsed: number;
  readonly durationMs: number;
}

/**
 * Wrap a throw-based async stage function into a Result-returning Stage.
 * Catches both AppError subclasses and unknown errors.
 */
function wrapThrowingStage(
  name: string,
  fn: (ctx: VerificationContext) => Promise<void>,
) {
  return makeStage(name, async (ctx) => {
    try {
      await fn(ctx);
      return ok(ctx);
    } catch (e: unknown) {
      if (e instanceof ValidationError || e instanceof InternalError) {
        return err(e as AppError);
      }
      const wrapped = InternalError.wrap(
        e,
        e instanceof Error ? e.message : `Stage "${name}" threw unexpectedly`,
      );
      return err(wrapped as AppError);
    }
  });
}

/**
 * Run a full verification against the given request.
 *
 * @param rawRequest - Unvalidated caller input (validated internally via Zod).
 * @param options    - Engine configuration: LLM provider, logger, knobs.
 * @returns A Result wrapping a VerificationResult or a typed AppError.
 */
export async function runVerification(
  rawRequest: unknown,
  options: EngineOptions,
): Promise<Result<VerificationResult, AppError>> {
  const logger: Logger = options.logger ?? noopLogger;
  const startMs = Date.now();

  // --- Validate the incoming request -----------------------------------------
  const parseResult = VerificationRequestSchema.safeParse(rawRequest);
  if (!parseResult.success) {
    const issues = parseResult.error.issues
      .map((i) => i.message)
      .join("; ");
    return err(
      new ValidationError({ message: `Invalid verification request: ${issues}` }) as AppError,
    );
  }
  const request = parseResult.data as VerificationRequest;

  // --- Build initial context --------------------------------------------------
  const inputText = request.text ?? request.claims?.join("\n") ?? "";

  const initialCtx: VerificationContext = {
    verificationId: newVerificationId(),
    startedAt: epochToIso(startMs),
    request,
    options,
    llm: options.llm,
    logger,
    inputText,
    normalizedText: "",
    claims: [],
    research: new Map(),
    adjudications: new Map(),
    adjudicatedClaims: [],
    trustScore: null,
    report: null,
    totalTokensUsed: 0,
  };

  logger.info("verification: starting", {
    verificationId: initialCtx.verificationId,
    hasText: Boolean(request.text),
    explicitClaims: request.claims?.length ?? 0,
  });

  // --- Compose and run pipeline ----------------------------------------------
  const pipeline = composePipeline([
    wrapThrowingStage("normalize", normalizeStage),
    wrapThrowingStage("resolve-claims", resolveClaimsStage),
    wrapThrowingStage("dedupe-claims", dedupeClaimsStage),
    scoreStage,
    assembleStage,
  ]);

  const pipelineResult = await pipeline.run(initialCtx);

  if (isErr(pipelineResult)) {
    logger.error("verification: pipeline failed", {
      code: pipelineResult.error.code,
      message: pipelineResult.error.message,
    });
    return err(pipelineResult.error);
  }

  const finalCtx = pipelineResult.value;

  if (!finalCtx.report) {
    return err(
      new InternalError({
        message: "Assemble stage did not produce a report",
      }) as AppError,
    );
  }

  const durationMs = Date.now() - startMs;

  logger.info("verification: complete", {
    verificationId: finalCtx.verificationId,
    trustScore: finalCtx.trustScore !== null ? Math.round(finalCtx.trustScore * 100) : null,
    claimCount: finalCtx.adjudicatedClaims.length,
    totalTokensUsed: finalCtx.totalTokensUsed,
    durationMs,
  });

  return ok({
    report: finalCtx.report,
    totalTokensUsed: finalCtx.totalTokensUsed,
    durationMs,
  });
}
