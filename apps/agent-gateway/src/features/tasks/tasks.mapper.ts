// Map between internal task representations and HTTP/A2A response shapes.

import { newId, epochToIso } from "@veritas/core";
import {
  makeA2ASuccess,
  makeA2AError,
  type A2AMessage,
  type A2AResponseEnvelope,
  type A2ATaskStatus,
  type A2ATaskPriority,
} from "@veritas/a2a-protocol";
import type { TaskRecord } from "./tasks.service.js";
import type { TaskResponse } from "./tasks.schema.js";

/** Normalise a raw inbound message object into a fully-formed A2AMessage. */
export function normaliseInboundMessage(
  raw: Record<string, unknown>,
  taskId: string,
  threadId: string
): A2AMessage {
  const now = epochToIso(Date.now());
  return {
    id: typeof raw["id"] === "string" ? raw["id"] : newId("msg"),
    taskId,
    threadId,
    role: (raw["role"] as A2AMessage["role"]) ?? "user",
    parts: (raw["parts"] as A2AMessage["parts"]) ?? [],
    createdAt: typeof raw["createdAt"] === "string" ? raw["createdAt"] : now,
    metadata: (raw["metadata"] as Record<string, unknown>) ?? undefined,
  };
}

/** Convert a TaskRecord to the public TaskResponse shape. */
export function toTaskResponse(record: TaskRecord): TaskResponse {
  return {
    taskId: record.taskId,
    threadId: record.threadId,
    status: record.status,
    priority: record.priority,
    correlationId: record.correlationId,
    createdAt: record.createdAt,
    finishedAt: record.finishedAt ?? null,
    durationMs: record.durationMs ?? null,
    report: record.report ?? null,
    errorCode: record.errorCode ?? null,
    errorMessage: record.errorMessage ?? null,
  };
}

/** Build a successful A2A response envelope for a completed task. */
export function toCompletedEnvelope(
  record: TaskRecord,
  correlationId?: string
): A2AResponseEnvelope {
  return makeA2ASuccess(
    {
      taskId: record.taskId,
      status: record.status,
      report: record.report ?? null,
    },
    correlationId
  );
}

/** Build an error A2A response envelope for a failed task. */
export function toFailedEnvelope(
  taskId: string,
  code: string,
  message: string,
  correlationId?: string
): A2AResponseEnvelope {
  return makeA2AError(code, message, correlationId, { taskId });
}

/** Build an accepted (in-progress) A2A response envelope for an async task. */
export function toAcceptedEnvelope(
  taskId: string,
  threadId: string,
  status: A2ATaskStatus,
  priority: A2ATaskPriority,
  correlationId?: string
): A2AResponseEnvelope {
  return makeA2ASuccess(
    { taskId, threadId, status, priority },
    correlationId
  );
}
