// Maps domain JobView projections to HTTP response shapes.
import type { JobView } from "@veritas/services";

/** HTTP response shape for a single verification job. */
export interface JobResponse {
  readonly id: string;
  readonly status: string;
  readonly verificationId: string | null;
  readonly attempts: number;
  readonly error: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a domain JobView to the HTTP response envelope data. */
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
