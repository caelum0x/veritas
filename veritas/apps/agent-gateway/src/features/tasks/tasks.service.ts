// Tasks service: orchestrates A2A task lifecycle using the verification engine.

import { ok, err, isErr, newId, epochToIso, type Result } from "@veritas/core";
import { runVerification } from "@veritas/verification";
import {
  A2AMessageSchema,
  type A2ATaskStatus,
  type A2ATaskPriority,
  type A2AResponseEnvelope,
} from "@veritas/a2a-protocol";
import type { Logger } from "@veritas/observability";
import type { EngineOptions } from "@veritas/verification";
import {
  GatewayRequestError,
  GatewayNotFoundError,
} from "../../errors.js";
import {
  normaliseInboundMessage,
  toCompletedEnvelope,
  toFailedEnvelope,
  toAcceptedEnvelope,
  toTaskResponse,
} from "./tasks.mapper.js";
import type { TaskResponse } from "./tasks.schema.js";

/** In-memory representation of a task throughout its lifecycle. */
export interface TaskRecord {
  readonly taskId: string;
  readonly threadId: string;
  readonly status: A2ATaskStatus;
  readonly priority: A2ATaskPriority;
  readonly correlationId?: string;
  readonly createdAt: string;
  readonly finishedAt?: string;
  readonly durationMs?: number;
  readonly report?: unknown;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface TasksDeps {
  readonly logger: Logger;
  readonly engineOptions: EngineOptions;
}

export interface SubmitTaskInput {
  readonly taskId?: string;
  readonly threadId?: string;
  readonly correlationId?: string;
  readonly priority: A2ATaskPriority;
  readonly message: Record<string, unknown>;
}

export interface ListTasksInput {
  readonly status?: A2ATaskStatus;
  readonly limit: number;
  readonly cursor?: string;
}

export interface ListTasksResult {
  readonly items: TaskResponse[];
  readonly nextCursor?: string;
}

/** Factory that returns a bound tasks service with an in-memory task store. */
export function createTasksService(deps: TasksDeps) {
  const { logger, engineOptions } = deps;

  // In-memory store keyed by taskId; ordered insertion list for pagination.
  const store = new Map<string, TaskRecord>();
  const insertionOrder: string[] = [];

  function upsert(record: TaskRecord): void {
    if (!store.has(record.taskId)) {
      insertionOrder.push(record.taskId);
    }
    store.set(record.taskId, record);
  }

  /** Submit a new task and run the verification pipeline synchronously. */
  async function submitTask(
    input: SubmitTaskInput
  ): Promise<Result<A2AResponseEnvelope>> {
    const taskId = input.taskId ?? newId("task");
    const threadId = input.threadId ?? taskId;
    const now = epochToIso(Date.now());

    // Build the initial pending record.
    const pending: TaskRecord = {
      taskId,
      threadId,
      status: "in-progress",
      priority: input.priority,
      correlationId: input.correlationId,
      createdAt: now,
    };
    upsert(pending);

    // Normalise and validate the inbound A2A message.
    const rawMsg = normaliseInboundMessage(input.message, taskId, threadId);
    const parsed = A2AMessageSchema.safeParse(rawMsg);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      const failed: TaskRecord = {
        ...pending,
        status: "failed",
        finishedAt: epochToIso(Date.now()),
        durationMs: 0,
        errorCode: "INVALID_MESSAGE",
        errorMessage: `Invalid A2A message: ${issues}`,
      };
      upsert(failed);
      return err(new GatewayRequestError(failed.errorMessage ?? "Invalid A2A message"));
    }

    const a2aMessage = parsed.data;
    const textPart = a2aMessage.parts.find((p) => p.kind === "text");
    if (!textPart || textPart.kind !== "text") {
      const failed: TaskRecord = {
        ...pending,
        status: "failed",
        finishedAt: epochToIso(Date.now()),
        durationMs: 0,
        errorCode: "NO_TEXT_PART",
        errorMessage: "A2A message must contain at least one text part",
      };
      upsert(failed);
      return err(new GatewayRequestError(failed.errorMessage ?? "No text part"));
    }

    logger.info("tasks-service: running verification", { taskId, threadId, priority: input.priority });
    const startMs = Date.now();

    const verificationRequest = {
      text: textPart.text,
      metadata: {
        a2aTaskId: taskId,
        a2aThreadId: threadId,
        priority: input.priority,
      },
    };

    const verifyResult = await runVerification(verificationRequest, engineOptions);
    const durationMs = Date.now() - startMs;
    const finishedAt = epochToIso(Date.now());

    if (isErr(verifyResult)) {
      const error = verifyResult.error;
      logger.error("tasks-service: verification failed", {
        taskId,
        code: error.code,
        message: error.message,
      });
      const failed: TaskRecord = {
        ...pending,
        status: "failed",
        finishedAt,
        durationMs,
        errorCode: String(error.code),
        errorMessage: error.message,
      };
      upsert(failed);
      return ok(
        toFailedEnvelope(taskId, String(error.code), error.message, input.correlationId)
      );
    }

    const { report, totalTokensUsed } = verifyResult.value;
    logger.info("tasks-service: task complete", { taskId, durationMs, totalTokensUsed });

    const completed: TaskRecord = {
      ...pending,
      status: "completed",
      finishedAt,
      durationMs,
      report,
    };
    upsert(completed);

    return ok(toCompletedEnvelope(completed, input.correlationId));
  }

  /** Get a single task by id. */
  function getTask(taskId: string): Result<TaskResponse> {
    const record = store.get(taskId);
    if (!record) {
      return err(new GatewayNotFoundError(`Task ${taskId} not found`));
    }
    return ok(toTaskResponse(record));
  }

  /** Cancel an in-progress or pending task. */
  function cancelTask(
    taskId: string,
    _reason?: string
  ): Result<TaskResponse> {
    const record = store.get(taskId);
    if (!record) {
      return err(new GatewayNotFoundError(`Task ${taskId} not found`));
    }
    if (record.status === "completed" || record.status === "failed") {
      return err(
        new GatewayRequestError(
          `Task ${taskId} is already in terminal state: ${record.status}`
        )
      );
    }
    const cancelled: TaskRecord = {
      ...record,
      status: "cancelled",
      finishedAt: epochToIso(Date.now()),
      durationMs: record.durationMs ?? 0,
    };
    upsert(cancelled);
    return ok(toTaskResponse(cancelled));
  }

  /** List tasks with optional status filter and cursor-based pagination. */
  function listTasks(input: ListTasksInput): Result<ListTasksResult> {
    const allIds = input.status
      ? insertionOrder.filter((id) => store.get(id)?.status === input.status)
      : [...insertionOrder];

    const startIndex = input.cursor
      ? allIds.indexOf(input.cursor) + 1
      : 0;

    const page = allIds.slice(startIndex, startIndex + input.limit);
    const items = page.map((id) => toTaskResponse(store.get(id)!));
    const nextCursor =
      startIndex + input.limit < allIds.length ? page[page.length - 1] : undefined;

    return ok({ items, nextCursor });
  }

  return { submitTask, getTask, cancelTask, listTasks };
}

export type TasksService = ReturnType<typeof createTasksService>;
