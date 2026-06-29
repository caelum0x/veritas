// Run registered sagas via the SagaOrchestrator, bridging the registry to execution.
import { type Result, ok, err, isErr } from "@veritas/core";
import {
  SagaOrchestrator,
  InMemorySagaStore,
  type SagaStorePort,
  type Saga,
} from "@veritas/sagas";
import type { Logger } from "@veritas/observability";
import { OrchestrationRegistry } from "./registry.js";
import { OrchestrationNotFoundError, OrchestrationExecutionError } from "./errors.js";

export interface SagaRunnerDeps {
  readonly registry: OrchestrationRegistry;
  readonly store?: SagaStorePort;
  readonly logger: Logger;
  readonly now?: () => number;
}

export interface SagaRunResult<TOutput = unknown> {
  readonly sagaId: string;
  readonly sagaName: string;
  readonly output: TOutput;
}

/** Drives saga execution by resolving definitions from the registry and delegating to SagaOrchestrator. */
export class SagaRunner {
  private readonly _registry: OrchestrationRegistry;
  private readonly _orchestrator: SagaOrchestrator;
  private readonly _logger: Logger;

  constructor(deps: SagaRunnerDeps) {
    this._registry = deps.registry;
    this._logger = deps.logger;
    this._orchestrator = new SagaOrchestrator({
      store: deps.store ?? new InMemorySagaStore(),
      logger: deps.logger,
      now: deps.now,
    });
  }

  /** Run a registered saga by name with the given sagaId and input. */
  async run<TInput = unknown, TOutput = unknown>(
    sagaName: string,
    sagaId: string,
    input: TInput
  ): Promise<Result<SagaRunResult<TOutput>>> {
    const entry = this._registry.get(sagaName);

    if (entry.kind !== "saga") {
      return err(
        new OrchestrationNotFoundError(
          `"${sagaName}" is registered as "${entry.kind}", not a saga`
        )
      );
    }

    this._logger.info("saga-runner: starting saga", { sagaName, sagaId });

    const result = await this._orchestrator.run(
      entry.saga as Saga<TInput, TOutput>,
      sagaId,
      input
    );

    if (isErr(result)) {
      this._logger.error("saga-runner: saga failed", {
        sagaName,
        sagaId,
        err: result.error,
      });
      return err(new OrchestrationExecutionError(sagaName, result.error));
    }

    this._logger.info("saga-runner: saga completed", { sagaName, sagaId });
    return ok({ sagaId, sagaName, output: result.value });
  }
}
