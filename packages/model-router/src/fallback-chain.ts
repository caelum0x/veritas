// Fallback chain: ordered list of (provider, modelId) pairs tried in sequence
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { RoutingTask, RoutingDecision, RoutingStrategy, FallbackEntry } from "./types.js";
import { FallbackExhaustedError } from "./errors.js";
import { getTaskProfile } from "./task-profile.js";

/**
 * Routing strategy that walks a fixed list of (provider, modelId) pairs.
 * Each entry is tried in order; the first one whose provider is available wins.
 * Since providers are pre-registered objects, availability is structural —
 * we return the first entry unconditionally (runtime health checks are out of scope).
 */
export class FallbackChainStrategy implements RoutingStrategy {
  readonly name = "fallback-chain";

  constructor(
    private readonly chain: ReadonlyArray<FallbackEntry>,
  ) {}

  select(task: RoutingTask): Result<RoutingDecision, AppError> {
    if (this.chain.length === 0) {
      return err(
        new FallbackExhaustedError({
          message: "Fallback chain is empty",
        }),
      );
    }

    const profile = getTaskProfile(task.kind);

    // Walk the chain; in a real implementation health probes would prune entries
    for (const entry of this.chain) {
      const { provider, modelId } = entry;

      // Estimated cost = 0 since we have no pricing metadata here
      return ok({
        provider,
        modelId,
        rationale: `Fallback chain selected "${modelId}" from provider "${provider.name}" (costSensitivity: ${profile.costSensitivity})`,
        estimatedCostUsd: 0,
      });
    }

    return err(
      new FallbackExhaustedError({
        message: `All ${this.chain.length} entries in the fallback chain were exhausted`,
      }),
    );
  }
}
