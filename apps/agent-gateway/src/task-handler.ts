// Handle A2A tasks by routing them through the Veritas verification engine.

import { ok, err, isErr, type Result } from "@veritas/core";
import { runVerification, type EngineOptions } from "@veritas/verification";
import type { Logger } from "@veritas/observability";
import {
  makeA2ASuccess,
  makeA2AError,
  type A2AResponseEnvelope,
  A2AMessageSchema,
} from "@veritas/a2a-protocol";
import { GatewayRequestError } from "./errors.js";

export interface TaskHandlerDeps {
  readonly logger: Logger;
  readonly engineOptions: EngineOptions;
}

export interface HandleTaskInput {
  readonly taskId: string;
  readonly threadId: string;
  /** Raw inbound message payload — validated internally. */
  readonly message: unknown;
  readonly correlationId?: string;
}

export interface TaskResult {
  readonly taskId: string;
  readonly status: "completed" | "failed";
  readonly reportJson?: unknown;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly durationMs: number;
}

/** Produce an A2A response envelope for a completed or failed task. */
function toEnvelope(result: TaskResult, correlationId?: string): A2AResponseEnvelope {
  if (result.status === "completed") {
    return makeA2ASuccess(
      { taskId: result.taskId, status: result.status, report: result.reportJson },
      correlationId
    );
  }
  return makeA2AError(
    result.errorCode ?? "TASK_FAILED",
    result.errorMessage ?? "Task processing failed",
    correlationId
  );
}

/** Factory that returns a bound task handler function. */
export function createTaskHandler(deps: TaskHandlerDeps) {
  const { logger, engineOptions } = deps;

  return async function handleTask(
    input: HandleTaskInput
  ): Promise<Result<A2AResponseEnvelope>> {
    const startMs = Date.now();
    const { taskId, threadId, message, correlationId } = input;

    // Validate the inbound A2A message
    const parsed = A2AMessageSchema.safeParse(message);
    if (!parsed.success) {
      return err(
        new GatewayRequestError(
          `Invalid A2A message: ${parsed.error.issues.map((i) => i.message).join("; ")}`
        )
      );
    }

    const a2aMessage = parsed.data;

    // Extract text content for verification
    const textPart = a2aMessage.parts.find((p) => p.kind === "text");
    if (!textPart || textPart.kind !== "text") {
      return err(
        new GatewayRequestError("A2A message must contain at least one text part")
      );
    }

    logger.info("task-handler: processing task", { taskId, threadId });

    // Build verification request from the A2A text payload
    const verificationRequest = {
      text: textPart.text,
      metadata: { a2aTaskId: taskId, a2aThreadId: threadId },
    };

    const verificationResult = await runVerification(verificationRequest, engineOptions);

    const durationMs = Date.now() - startMs;

    if (isErr(verificationResult)) {
      const error = verificationResult.error;
      logger.error("task-handler: verification failed", {
        taskId,
        code: error.code,
        message: error.message,
      });

      const taskResult: TaskResult = {
        taskId,
        status: "failed",
        errorCode: String(error.code),
        errorMessage: error.message,
        durationMs,
      };

      return ok(toEnvelope(taskResult, correlationId));
    }

    const { report, totalTokensUsed } = verificationResult.value;

    logger.info("task-handler: task complete", {
      taskId,
      durationMs,
      totalTokensUsed,
    });

    const taskResult: TaskResult = {
      taskId,
      status: "completed",
      reportJson: report,
      durationMs,
    };

    return ok(toEnvelope(taskResult, correlationId));
  };
}
