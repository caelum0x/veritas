// Normalize stage: sanitize and trim raw input text before further processing.

import { normalizeWhitespace, isBlank, truncate } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import type { VerificationContext } from "../pipeline/context.js";

/** Maximum document size accepted by the engine (characters). */
const MAX_INPUT_CHARS = 100_000;

/**
 * Pipeline stage that cleans the raw input text.
 *
 * Responsibilities:
 * - Reject blank or oversized inputs.
 * - Strip leading/trailing whitespace and collapse internal runs.
 * - Store the result in `ctx.normalizedText`.
 */
export async function normalizeStage(ctx: VerificationContext): Promise<void> {
  const logger = ctx.options.logger;

  const raw = ctx.inputText;

  if (isBlank(raw)) {
    throw new ValidationError({ message: "Input text must not be blank." });
  }

  if (raw.length > MAX_INPUT_CHARS) {
    logger?.warn("normalize: input truncated", {
      originalLength: raw.length,
      limit: MAX_INPUT_CHARS,
    });
  }

  // Truncate to guard against absurdly large documents.
  const bounded = truncate(raw, MAX_INPUT_CHARS);

  // Collapse unicode whitespace runs and strip outer whitespace.
  const normalized = normalizeWhitespace(bounded);

  if (isBlank(normalized)) {
    throw new ValidationError({
      message: "Input text is empty after normalization.",
    });
  }

  logger?.info("normalize: complete", { length: normalized.length });

  // Immutable update via assignment to the mutable slot on context.
  ctx.normalizedText = normalized;
}
