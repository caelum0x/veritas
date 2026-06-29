// Responder: thin helpers for sending consistent JSON API envelopes from route handlers.
import type { Response } from "express";

export interface PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

/** Send a 200 success response with optional pagination metadata. */
export function ok<T>(res: Response, data: T, meta?: PaginationMeta): void {
  const body = meta ? { success: true, data, meta } : { success: true, data };
  res.status(200).json(body);
}

/** Send a 201 created response. */
export function created<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

/** Send a 204 no-content response. */
export function noContent(res: Response): void {
  res.status(204).end();
}

/** Send an error response with the given status, code, and message. */
export function fail(res: Response, status: number, code: string, message: string, detail?: unknown): void {
  res.status(status).json({
    success: false,
    error: { code, message, ...(detail !== undefined ? { detail } : {}) },
  });
}

/** Send a 404 not-found response. */
export function notFound(res: Response, resource: string, id?: string): void {
  const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
  fail(res, 404, "NOT_FOUND", msg);
}

/** Send a 422 validation-error response. */
export function validationError(res: Response, message: string, detail?: unknown): void {
  fail(res, 422, "VALIDATION_ERROR", message, detail);
}
