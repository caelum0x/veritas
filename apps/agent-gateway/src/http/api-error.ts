// Typed HTTP API error used across response helpers.

import { AppError, isAppError } from "@veritas/core";

export interface ApiErrorBody {
  readonly type: string;
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly instance?: string;
}

/** Map any thrown value to a status code and body. */
export function toApiError(err: unknown): { status: number; body: ApiErrorBody } {
  if (isAppError(err)) {
    return {
      status: (err as AppError & { statusCode?: number }).statusCode ?? 500,
      body: {
        type: `https://veritas.croo.ai/errors/${err.code}`,
        status: (err as AppError & { statusCode?: number }).statusCode ?? 500,
        title: err.code,
        detail: err.message,
      },
    };
  }

  if (err instanceof Error) {
    return {
      status: 500,
      body: {
        type: "https://veritas.croo.ai/errors/INTERNAL",
        status: 500,
        title: "INTERNAL",
        detail: err.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      type: "https://veritas.croo.ai/errors/INTERNAL",
      status: 500,
      title: "INTERNAL",
      detail: "An unexpected error occurred",
    },
  };
}
