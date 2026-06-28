// Typed HTTP response helpers — wraps JSON envelope conventions.
import type { Response } from "express";

export interface SuccessEnvelope<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

export function sendOk<T>(res: Response, data: T, meta?: Record<string, unknown>): void {
  const body: SuccessEnvelope<T> = { success: true, data, ...(meta ? { meta } : {}) };
  res.status(200).json(body);
}

export function sendCreated<T>(res: Response, data: T): void {
  const body: SuccessEnvelope<T> = { success: true, data };
  res.status(201).json(body);
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
  const body: ErrorEnvelope = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  res.status(status).json(body);
}

export function sendPagedOk<T>(
  res: Response,
  items: readonly T[],
  total: number,
  page: number,
  limit: number,
): void {
  sendOk(res, items, { total, page, limit, pages: Math.ceil(total / limit) });
}
