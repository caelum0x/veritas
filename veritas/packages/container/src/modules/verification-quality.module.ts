// Verification-quality module: adapts @veritas/guardrails and
// @veritas/confidence-calibration to the engine's vendor-agnostic seams and
// registers them as singletons.

import { isOk } from "@veritas/core";
import type { Logger } from "@veritas/core";
import {
  GuardrailRegistry,
  GuardrailPipeline,
  PromptInjectionGuardrail,
  JailbreakGuardrail,
  PiiInputGuardrail,
} from "@veritas/guardrails";
import { PlattCalibrator } from "@veritas/confidence-calibration";
import { deduplicateCitations } from "@veritas/citations-llm";
import type { LlmCitation } from "@veritas/citations-llm";
import type {
  InputGuard,
  GuardDecision,
  ConfidenceCalibrator,
  CitationRefiner,
  CitationLike,
} from "@veritas/verification";
import type { Container } from "../container.js";
import {
  LOGGER,
  INPUT_GUARD,
  CONFIDENCE_CALIBRATOR,
  CITATION_REFINER,
  VERIFICATION_CONFIG,
} from "../tokens.js";

/** Identity calibrator: returns confidences unchanged. */
const IDENTITY_CALIBRATOR: ConfidenceCalibrator = { calibrate: (raw) => raw };

/** Fitted Platt parameters, e.g. persisted from a real calibration run. */
interface PlattParams {
  readonly A: number;
  readonly B: number;
}

/** Read fitted Platt params from verification config, if present and valid. */
function readPlattParams(config: Record<string, unknown> | undefined): PlattParams | undefined {
  const raw = config?.["calibration"];
  if (raw === null || typeof raw !== "object") return undefined;
  const { A, B } = raw as Record<string, unknown>;
  if (typeof A === "number" && typeof B === "number") return { A, B };
  return undefined;
}

/** Monotonic counter for guardrail request ids (deterministic, no RNG). */
let guardSeq = 0;

/**
 * Build an InputGuard backed by the guardrails pipeline (input-phase guardrails
 * only). A `block` decision maps to `{ allowed: false }`; everything else
 * passes through.
 */
function buildInputGuard(): InputGuard {
  const registry = new GuardrailRegistry()
    .register(new PromptInjectionGuardrail())
    .register(new JailbreakGuardrail())
    .register(new PiiInputGuardrail());
  const pipeline = new GuardrailPipeline(registry);

  return {
    async check(content: string): Promise<GuardDecision> {
      guardSeq += 1;
      const result = await pipeline.run({
        requestId: `verify-input-${guardSeq}`,
        content,
        phase: "input",
      });

      if (!isOk(result)) {
        // A failed pipeline must not silently allow unsafe input.
        const reason =
          result.error instanceof Error
            ? result.error.message
            : String(result.error);
        return { allowed: false, reason };
      }

      const { finalDecision, results } = result.value;
      if (finalDecision === "block") {
        const blocking = results.find((r) => r.decision === "block");
        return {
          allowed: false,
          reason: blocking?.reason ?? "blocked by guardrails",
        };
      }
      return { allowed: true };
    },
  };
}

/**
 * Build a ConfidenceCalibrator from real fitted Platt parameters. Calibration is
 * only applied when genuine parameters (from a real calibration run) are
 * supplied — otherwise confidences pass through unchanged. We never fabricate a
 * synthetic training set, so an unconfigured deployment reports raw confidences
 * rather than ones bent by made-up data.
 */
function buildCalibrator(params: PlattParams | undefined): ConfidenceCalibrator {
  if (params === undefined) return IDENTITY_CALIBRATOR;

  const platt = new PlattCalibrator();
  const loaded = platt.loadParams({ A: params.A, B: params.B });
  if (!isOk(loaded)) return IDENTITY_CALIBRATOR;

  return {
    calibrate(rawConfidence: number): number {
      const predicted = platt.predict(rawConfidence);
      return isOk(predicted) ? predicted.value : rawConfidence;
    },
  };
}

/**
 * Fixed creation timestamp for the citation projection. Deduplication keys are
 * derived from span content, never from createdAt, so a constant keeps the
 * mapping pure and deterministic.
 */
const CITATION_EPOCH = "1970-01-01T00:00:00.000Z";

/**
 * Build a CitationRefiner backed by `@veritas/citations-llm`'s content-hash
 * deduplication. Pipeline citations are projected onto the LlmCitation shape
 * (sourceId/offsets/text derived from url + quote), deduplicated, then mapped
 * back to the original citations so title/supports are preserved.
 */
function buildCitationRefiner(): CitationRefiner {
  return {
    dedupe(citations: ReadonlyArray<CitationLike>): ReadonlyArray<CitationLike> {
      if (citations.length < 2) return citations;

      const byId = new Map<string, CitationLike>();
      const projected: LlmCitation[] = citations.map((c, i) => {
        const id = `cite-${i}`;
        byId.set(id, c);
        const quote = c.quote ?? "";
        return {
          id,
          claimId: "claim",
          span: {
            sourceId: c.url,
            url: c.url,
            startOffset: 0,
            endOffset: quote.length,
            text: quote,
          },
          quote,
          confidence: 1,
          createdAt: CITATION_EPOCH,
        };
      });

      const result = deduplicateCitations(projected);
      if (!isOk(result)) return citations;

      return result.value.unique
        .map((u) => byId.get(u.id))
        .filter((c): c is CitationLike => c !== undefined);
    },
  };
}

/**
 * Register the input guard, confidence calibrator, and citation refiner
 * singletons. Consumed by the verification module when assembling EngineOptions.
 */
export function registerVerificationQualityModule(container: Container): void {
  container.singleton(INPUT_GUARD, (c): InputGuard => {
    const guard = buildInputGuard();
    c.tryResolve<Logger>(LOGGER)?.debug("verification-quality: input guard ready");
    return guard;
  });

  container.singleton(CONFIDENCE_CALIBRATOR, (c): ConfidenceCalibrator => {
    const params = readPlattParams(c.tryResolve<Record<string, unknown>>(VERIFICATION_CONFIG));
    const calibrator = buildCalibrator(params);
    c.tryResolve<Logger>(LOGGER)?.debug("verification-quality: calibrator ready", {
      calibrated: params !== undefined,
    });
    return calibrator;
  });

  container.singleton(CITATION_REFINER, (c): CitationRefiner => {
    const refiner = buildCitationRefiner();
    c.tryResolve<Logger>(LOGGER)?.debug("verification-quality: citation refiner ready");
    return refiner;
  });
}
