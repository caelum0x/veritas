// Routing policy: validates task constraints and enforces platform-level rules
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import { z } from "zod";
import type { RoutingTask } from "./types.js";
import { RoutingPolicyError } from "./errors.js";

/** Configurable limits for the routing policy */
export interface PolicyConfig {
  /** Maximum allowed budget in USD (0 = no cap) */
  readonly maxBudgetUsd: number;
  /** Maximum allowed input token count */
  readonly maxInputTokens: number;
  /** Set of task kinds permitted by this policy */
  readonly allowedKinds: ReadonlySet<string>;
}

/** Default permissive policy used when no overrides are needed */
export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  maxBudgetUsd: 0,
  maxInputTokens: 200_000,
  allowedKinds: new Set([
    "extract-claims",
    "research",
    "adjudicate",
    "summarize",
    "classify",
    "general",
  ]),
};

const routingTaskSchema = z.object({
  kind: z.string(),
  estimatedInputTokens: z.number().int().min(0),
  qualityTier: z.enum(["economy", "balanced", "premium"]).optional(),
  requiresWebSearch: z.boolean().optional(),
  budgetUsd: z.number().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/** Validates and enforces policy rules on an incoming RoutingTask */
export class RoutingPolicy {
  constructor(private readonly config: PolicyConfig = DEFAULT_POLICY_CONFIG) {}

  /** Returns ok(task) if the task passes all policy checks, err otherwise */
  validate(task: RoutingTask): Result<RoutingTask, AppError> {
    // Structural validation via Zod
    const parsed = routingTaskSchema.safeParse(task);
    if (!parsed.success) {
      return err(
        new RoutingPolicyError({
          message: `Invalid routing task: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
        }),
      );
    }

    // Kind allowlist
    if (!this.config.allowedKinds.has(task.kind)) {
      return err(
        new RoutingPolicyError({
          message: `Task kind "${task.kind}" is not permitted by routing policy`,
        }),
      );
    }

    // Token limit
    if (task.estimatedInputTokens > this.config.maxInputTokens) {
      return err(
        new RoutingPolicyError({
          message: `Estimated input tokens (${task.estimatedInputTokens}) exceeds policy limit (${this.config.maxInputTokens})`,
        }),
      );
    }

    // Budget cap (only enforced when policy has a non-zero cap)
    if (
      this.config.maxBudgetUsd > 0 &&
      task.budgetUsd !== undefined &&
      task.budgetUsd > this.config.maxBudgetUsd
    ) {
      return err(
        new RoutingPolicyError({
          message: `Requested budget $${task.budgetUsd} exceeds policy cap $${this.config.maxBudgetUsd}`,
        }),
      );
    }

    return ok(task);
  }
}
