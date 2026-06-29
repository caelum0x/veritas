// Typed HTTP responder helpers that produce consistent @veritas/contracts envelope shapes.

import type { Response } from "express";

export interface SuccessEnvelope<T> {
  readonly success: true;
  readonly data: T;
  readonly error: null;
}

export interface PageEnvelope<T> {
  readonly success: true;
  readonly data: T[];
  readonly error: null;
  readonly meta: {
    readonly total?: number;
    readonly nextCursor: string | null;
    readonly hasMore: boolean;
  };
}

export interface FailureEnvelope {
  readonly success: false;
  readonly data: null;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
}

/** Send a successful response wrapped in the standard envelope. */
export function sendOk<T>(res: Response, data: T, status = 200): void {
  const body: SuccessEnvelope<T> = { success: true, data, error: null };
  res.status(status).json(body);
}

/** Send a 201 Created response. */
export function sendCreated<T>(res: Response, data: T): void {
  sendOk(res, data, 201);
}

/** Send a 204 No Content response. */
export function sendNoContent(res: Response): void {
  res.status(204).end();
}

/** Send a paginated list response. */
export function sendPage<T>(
  res: Response,
  data: T[],
  meta: PageEnvelope<T>["meta"],
): void {
  const body: PageEnvelope<T> = { success: true, data, error: null, meta };
  res.status(200).json(body);
}

/** Send a failure response. */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  const body: FailureEnvelope = {
    success: false,
    data: null,
    error: { code, message, ...(details ? { details } : {}) },
  };
  res.status(status).json(body);
}
