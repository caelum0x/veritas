// SagaOrchestrator: drives a Saga through its steps, persists state, and triggers compensation.
import { isOk, isErr, type Result, ok, err } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { Saga } from "./saga.js";
import type { SagaStorePort } from "./store.js";
import { createSagaContext, extendSagaContext } from "./context.js";
import {
  initialSagaState,
  updateSagaState,
  updateStep,
} from "./state.js";
import { stepNamesOf } from "./saga.js";
import { runCompensation } from "./compensation.js";
import { withStepRetry } from "./retry.js";
import { DEFAULT_STEP_RETRY } from "./step.js";
import { SagaStepError } from "./errors.js";

export interface OrchestratorDeps {
  readonly store: SagaStorePort;
  readonly logger: Logger;
  /** Injected clock for testability; defaults to Date.now. */
  readonly now?: () => number;
}

export class SagaOrchestrator {
  private readonly store: SagaStorePort;
  private readonly logger: Logger;
  private readonly nowMs: () => number;

  constructor(deps: OrchestratorDeps) {
    this.store = deps.store;
    this.logger = deps.logger;
    this.nowMs = deps.now ?? (() => Date.now());
  }

  /** Start a new saga run for `sagaId` with the given input. */
  async run<TInput, TOutput>(
    saga: Saga<TInput, TOutput>,
    sagaId: string,
    input: TInput,
  ): Promise<Result<TOutput, unknown>> {
    const now = epochToIso(this.nowMs());
    const stepNames = stepNamesOf(saga as Saga<unknown, unknown>);

    let state = initialSagaState(sagaId, saga.name, stepNames, input, now);
    const saveResult = await this.store.save(state);
    if (isErr(saveResult)) return err(saveResult.error);

    state = updateSagaState(state, { status: "running" }, epochToIso(this.nowMs()));
    await this.store.update(state);

    let ctx = createSagaContext(sagaId, saga.name, this.logger);
    const completedStepNames: string[] = [];

    for (const step of saga.steps) {
      const stepNow = epochToIso(this.nowMs());
      state = updateStep(state, step.name, { status: "running", startedAt: stepNow }, stepNow);
      await this.store.update(state);

      const policy = step.retry ?? DEFAULT_STEP_RETRY;
      const result = await withStepRetry(
        step.name,
        () => step.execute(input, ctx),
        policy,
        (event) => {
          this.logger.warn("step attempt failed, retrying", {
            sagaId,
            stepName: step.name,
            attempt: event.attempt,
            err: event.error,
          });
        },
      );

      const doneNow = epochToIso(this.nowMs());

      if (isOk(result)) {
        ctx = extendSagaContext(ctx, result.value);
        completedStepNames.push(step.name);
        state = updateStep(state, step.name, { status: "completed", completedAt: doneNow }, doneNow);
        await this.store.update(state);
        this.logger.info("step completed", { sagaId, stepName: step.name });
      } else {
        const stepErr = new SagaStepError(sagaId, step.name, result.error);
        this.logger.error("step failed", { sagaId, stepName: step.name, err: stepErr });

        state = updateStep(
          state,
          step.name,
          { status: "failed", error: stepErr.message, completedAt: doneNow },
          doneNow,
        );
        state = updateSagaState(state, { status: "compensating", error: stepErr.message }, doneNow);
        await this.store.update(state);

        await runCompensation(
          sagaId,
          saga.steps as Saga<unknown, unknown>["steps"],
          completedStepNames,
          input as unknown,
          ctx,
          this.logger,
        );

        const failNow = epochToIso(this.nowMs());
        state = updateSagaState(
          state,
          { status: "compensated", completedAt: failNow },
          failNow,
        );
        await this.store.update(state);

        return err(stepErr);
      }
    }

    const outputResult = saga.buildOutput(input, ctx.data);
    if (isErr(outputResult)) {
      const finNow = epochToIso(this.nowMs());
      state = updateSagaState(
        state,
        { status: "failed", error: String(outputResult.error), completedAt: finNow },
        finNow,
      );
      await this.store.update(state);
      return err(outputResult.error);
    }

    const finNow = epochToIso(this.nowMs());
    state = updateSagaState(
      state,
      { status: "completed", output: outputResult.value, completedAt: finNow },
      finNow,
    );
    await this.store.update(state);
    this.logger.info("saga completed", { sagaId, sagaName: saga.name });

    return ok(outputResult.value);
  }
}
