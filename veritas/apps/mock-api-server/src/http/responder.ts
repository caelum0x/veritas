// Thin response helpers for consistent success/error JSON envelopes.
import type { Response } from "express";
import { makeApiError } from "./api-error.js";

export type SuccessBody<T> = {
  readonly success: true;
  readonly data: T;
  readonly error: null;
  readonly meta?: unknown;
};

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: SuccessBody<T> = { success: true, data, error: null };
  res.status(status).json(body);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  res.status(status).json(makeApiError(code, message, details));
}

export function sendNotFound(res: Response, message: string): void {
  sendError(res, 404, "NOT_FOUND", message);
}

export function sendBadRequest(res: Response, message: string, details?: unknown): void {
  sendError(res, 400, "BAD_REQUEST", message, details);
}

export function sendConflict(res: Response, message: string): void {
  sendError(res, 409, "CONFLICT", message);
}

export function sendUnprocessable(res: Response, message: string, issues?: unknown): void {
  sendError(res, 422, "VALIDATION_ERROR", message, issues);
}

export function sendInternalError(res: Response, message = "Internal server error"): void {
  sendError(res, 500, "INTERNAL_ERROR", message);
}
