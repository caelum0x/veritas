// Domain events for the VerificationJob aggregate lifecycle.
import type { JobStatus } from "@veritas/core";
import type { VerificationRequest } from "@veritas/contracts";

export const VJ_CREATED = "VerificationJobCreated" as const;
export const VJ_STARTED = "VerificationJobStarted" as const;
export const VJ_ATTEMPT_RECORDED = "VerificationJobAttemptRecorded" as const;
export const VJ_COMPLETED = "VerificationJobCompleted" as const;
export const VJ_FAILED = "VerificationJobFailed" as const;
export const VJ_CANCELLED = "VerificationJobCancelled" as const;

export type VerificationJobEventType =
  | typeof VJ_CREATED
  | typeof VJ_STARTED
  | typeof VJ_ATTEMPT_RECORDED
  | typeof VJ_COMPLETED
  | typeof VJ_FAILED
  | typeof VJ_CANCELLED;

export interface VjCreatedPayload {
  readonly jobId: string;
  readonly orderId: string | null;
  readonly request: VerificationRequest;
  readonly metadata: Record<string, unknown>;
}

export interface VjStartedPayload {
  readonly startedAt: string;
}

export interface VjAttemptRecordedPayload {
  readonly attempt: number;
  readonly error: string | null;
}

export interface VjCompletedPayload {
  readonly verificationId: string;
  readonly finishedAt: string;
}

export interface VjFailedPayload {
  readonly error: string;
  readonly finishedAt: string;
}

export interface VjCancelledPayload {
  readonly reason: string;
}

export type VerificationJobEventPayload =
  | { type: typeof VJ_CREATED; data: VjCreatedPayload }
  | { type: typeof VJ_STARTED; data: VjStartedPayload }
  | { type: typeof VJ_ATTEMPT_RECORDED; data: VjAttemptRecordedPayload }
  | { type: typeof VJ_COMPLETED; data: VjCompletedPayload }
  | { type: typeof VJ_FAILED; data: VjFailedPayload }
  | { type: typeof VJ_CANCELLED; data: VjCancelledPayload };

export type { JobStatus };
