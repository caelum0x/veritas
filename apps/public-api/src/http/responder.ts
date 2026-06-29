// responder.ts: HTTP response helpers wrapping data/pages in the standard ApiResponse envelope.
import type { Response } from "express";
import type { Page } from "@veritas/core";
import { apiSuccess, apiPage, apiFailure } from "@veritas/core";
import type { ErrorCode } from "@veritas/core";

/** Send a 200 success response containing a single resource. */
export function sendOk<T>(res: Response, data: T): void {
  res.status(200).json(apiSuccess(data));
}

/** Send a 201 success response for a newly created resource. */
export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json(apiSuccess(data));
}

/** Send a 204 No Content response (e.g. successful deletion). */
export function sendNoContent(res: Response): void {
  res.status(204).end();
}

/** Send a paginated 200 response from a Page<T>. */
export function sendPage<T>(res: Response, page: Page<T>): void {
  res.status(200).json(
    apiPage(page.items, {
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    }),
  );
}

/** Send a structured error response for inline (non-middleware) error returns. */
export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): void {
  res.status(status).json(
    apiFailure({ code, message, ...(details ? { details } : {}) }),
  );
}

// Aliases used by generated controllers
export const respondOk: typeof sendOk = sendOk;
export const respondCreated: typeof sendCreated = sendCreated;
export const respondNoContent: typeof sendNoContent = sendNoContent;
export const respondPage: typeof sendPage = sendPage;
export const respondError: typeof sendError = sendError;

/** Responder interface used by class-based controllers. */
export interface Responder {
  ok<T>(res: Response, data: T): void;
  created<T>(res: Response, data: T): void;
  noContent(res: Response): void;
  page<T>(res: Response, page: Page<T>): void;
  error(res: Response, status: number, code: ErrorCode, message: string, details?: Record<string, unknown>): void;
}

/** Default Responder implementation delegating to the send* helpers. */
export const defaultResponder: Responder = {
  ok: sendOk,
  created: sendCreated,
  noContent: sendNoContent,
  page: sendPage,
  error: sendError,
};
