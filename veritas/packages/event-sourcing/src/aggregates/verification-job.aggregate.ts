// VerificationJob aggregate: manages lifecycle of an async verification work item.
import { JobStatus, newJobId, type JobId } from "@veritas/core";
import type { VerificationRequest } from "@veritas/contracts";
import { AggregateRoot } from "../aggregate-root.js";
import type { StoredEvent } from "../domain-event.js";
import { ConcurrencyError } from "../errors.js";
import {
  VJ_CREATED,
  VJ_STARTED,
  VJ_ATTEMPT_RECORDED,
  VJ_COMPLETED,
  VJ_FAILED,
  VJ_CANCELLED,
  type VjCreatedPayload,
  type VjStartedPayload,
  type VjAttemptRecordedPayload,
  type VjCompletedPayload,
  type VjFailedPayload,
  type VjCancelledPayload,
} from "./verification-job.events.js";

export interface VerificationJobState {
  readonly jobId: string;
  readonly orderId: string | null;
  readonly request: VerificationRequest;
  readonly status: JobStatus;
  readonly attempts: number;
  readonly verificationId: string | null;
  readonly error: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly metadata: Record<string, unknown>;
}

export class VerificationJobAggregate extends AggregateRoot {
  readonly aggregateType = "VerificationJob";

  private _jobId: string = "";
  private _orderId: string | null = null;
  private _request: VerificationRequest | null = null;
  private _status: JobStatus = JobStatus.QUEUED;
  private _attempts: number = 0;
  private _verificationId: string | null = null;
  private _error: string | null = null;
  private _startedAt: string | null = null;
  private _finishedAt: string | null = null;
  private _metadata: Record<string, unknown> = {};

  get id(): string {
    return this._jobId;
  }

  get state(): VerificationJobState {
    return {
      jobId: this._jobId,
      orderId: this._orderId,
      request: this._request as VerificationRequest,
      status: this._status,
      attempts: this._attempts,
      verificationId: this._verificationId,
      error: this._error,
      startedAt: this._startedAt,
      finishedAt: this._finishedAt,
      metadata: this._metadata,
    };
  }

  static create(
    request: VerificationRequest,
    orderId: string | null = null,
    metadata: Record<string, unknown> = {}
  ): VerificationJobAggregate {
    const aggregate = new VerificationJobAggregate();
    const jobId = newJobId();
    const payload: VjCreatedPayload = {
      jobId,
      orderId,
      request,
      metadata,
    };
    aggregate._jobId = jobId;
    aggregate.raise(VJ_CREATED, payload);
    return aggregate;
  }

  start(startedAt: string): void {
    if (this._status !== JobStatus.QUEUED) {
      throw new ConcurrencyError(
        this._jobId,
        this._version,
        this._version
      );
    }
    const payload: VjStartedPayload = { startedAt };
    this.raise(VJ_STARTED, payload);
  }

  recordAttempt(error: string | null): void {
    if (this._status !== JobStatus.RUNNING) {
      throw new ConcurrencyError(
        this._jobId,
        this._version,
        this._version
      );
    }
    const payload: VjAttemptRecordedPayload = {
      attempt: this._attempts + 1,
      error,
    };
    this.raise(VJ_ATTEMPT_RECORDED, payload);
  }

  complete(verificationId: string, finishedAt: string): void {
    if (this._status !== JobStatus.RUNNING) {
      throw new ConcurrencyError(
        this._jobId,
        this._version,
        this._version
      );
    }
    const payload: VjCompletedPayload = { verificationId, finishedAt };
    this.raise(VJ_COMPLETED, payload);
  }

  fail(error: string, finishedAt: string): void {
    if (this._status !== JobStatus.RUNNING) {
      throw new ConcurrencyError(
        this._jobId,
        this._version,
        this._version
      );
    }
    const payload: VjFailedPayload = { error, finishedAt };
    this.raise(VJ_FAILED, payload);
  }

  cancel(reason: string): void {
    if (
      this._status === JobStatus.SUCCEEDED ||
      this._status === JobStatus.CANCELLED
    ) {
      throw new ConcurrencyError(
        this._jobId,
        this._version,
        this._version
      );
    }
    const payload: VjCancelledPayload = { reason };
    this.raise(VJ_CANCELLED, payload);
  }

  apply(event: StoredEvent): void {
    switch (event.eventType) {
      case VJ_CREATED: {
        const p = event.payload as VjCreatedPayload;
        this._jobId = p.jobId;
        this._orderId = p.orderId;
        this._request = p.request;
        this._status = JobStatus.QUEUED;
        this._metadata = p.metadata;
        break;
      }
      case VJ_STARTED: {
        const p = event.payload as VjStartedPayload;
        this._status = JobStatus.RUNNING;
        this._startedAt = p.startedAt;
        break;
      }
      case VJ_ATTEMPT_RECORDED: {
        const p = event.payload as VjAttemptRecordedPayload;
        this._attempts = p.attempt;
        this._error = p.error;
        break;
      }
      case VJ_COMPLETED: {
        const p = event.payload as VjCompletedPayload;
        this._status = JobStatus.SUCCEEDED;
        this._verificationId = p.verificationId;
        this._finishedAt = p.finishedAt;
        this._error = null;
        break;
      }
      case VJ_FAILED: {
        const p = event.payload as VjFailedPayload;
        this._status = JobStatus.FAILED;
        this._error = p.error;
        this._finishedAt = p.finishedAt;
        break;
      }
      case VJ_CANCELLED: {
        const p = event.payload as VjCancelledPayload;
        this._status = JobStatus.CANCELLED;
        this._error = p.reason;
        break;
      }
      default:
        break;
    }
  }
}
