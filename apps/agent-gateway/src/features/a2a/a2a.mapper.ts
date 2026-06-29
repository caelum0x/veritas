// Maps between internal A2A protocol types and HTTP response shapes.

import {
  type A2AResponseEnvelope,
  type A2AMessage,
  makeA2ASuccess,
  makeA2AError,
} from "@veritas/a2a-protocol";

/** Completed task result shape returned to callers. */
export interface TaskResponseDto {
  readonly taskId: string;
  readonly threadId: string;
  readonly status: "completed" | "failed";
  readonly report?: unknown;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly durationMs: number;
  readonly correlationId?: string;
}

/** Map a completed task result into an A2A response envelope. */
export function taskResultToEnvelope(
  dto: TaskResponseDto
): A2AResponseEnvelope {
  if (dto.status === "completed") {
    return makeA2ASuccess(
      {
        taskId: dto.taskId,
        threadId: dto.threadId,
        status: dto.status,
        report: dto.report,
        durationMs: dto.durationMs,
      },
      dto.correlationId
    );
  }
  return makeA2AError(
    dto.errorCode ?? "TASK_FAILED",
    dto.errorMessage ?? "Task processing failed",
    dto.correlationId
  );
}

/** Map an A2A message into a safe loggable summary (no PII). */
export function messageSummary(
  msg: A2AMessage
): Record<string, unknown> {
  return {
    id: msg.id,
    taskId: msg.taskId,
    threadId: msg.threadId,
    role: msg.role,
    partCount: msg.parts.length,
    kinds: msg.parts.map((p) => p.kind),
    createdAt: msg.createdAt,
  };
}
