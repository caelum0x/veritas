// Maps @veritas/services JobView projections to HTTP response shapes.
import type { JobView } from "@veritas/services";
import type { JobStatus } from "@veritas/core";

/** HTTP-facing job resource — mirrors JobView but ensures serialisability. */
export interface JobResponse {
  readonly id: string;
  readonly status: JobStatus;
  readonly verificationId: string | null;
  readonly attempts: number;
  readonly error: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Map a service-layer JobView to the HTTP response shape. */
export function toJobResponse(view: JobView): JobResponse {
  return {
    id: view.id,
    status: view.status,
    verificationId: view.verificationId,
    attempts: view.attempts,
    error: view.error,
    startedAt: view.startedAt,
    finishedAt: view.finishedAt,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}
