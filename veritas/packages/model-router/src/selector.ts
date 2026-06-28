// Model selector: applies a prioritized list of strategies to pick a model
import { ok, err, isOk } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { RoutingTask, RoutingDecision, RoutingStrategy } from "./types.js";
import { NoModelAvailableError } from "./errors.js";

/**
 * Tries each strategy in order, returning the first successful decision.
 * Returns NoModelAvailableError if all strategies fail.
 */
export class ModelSelector {
  constructor(
    private readonly strategies: ReadonlyArray<RoutingStrategy>,
  ) {}

  select(task: RoutingTask): Result<RoutingDecision, AppError> {
    for (const strategy of this.strategies) {
      const result = strategy.select(task);
      if (isOk(result)) return result;
    }
    return err(
      new NoModelAvailableError({
        message: `All ${this.strategies.length} routing strategies failed for task kind "${task.kind}"`,
      }),
    );
  }
}
