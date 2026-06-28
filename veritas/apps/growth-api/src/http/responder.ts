// Typed HTTP responder helpers for consistent JSON envelopes.
import type { Response } from "express";

export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly meta?: {
    readonly total?: number;
    readonly page?: number;
    readonly limit?: number;
  };
}

export function ok<T>(res: Response, data: T, statusCode = 200): void {
  const envelope: ApiEnvelope<T> = { success: true, data };
  res.status(statusCode).json(envelope);
}

export function created<T>(res: Response, data: T): void {
  ok(res, data, 201);
}

export function noContent(res: Response): void {
  res.status(204).end();
}

export function paginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
): void {
  const envelope: ApiEnvelope<T[]> = {
    success: true,
    data,
    meta: { total, page, limit },
  };
  res.status(200).json(envelope);
}

export function fail(res: Response, statusCode: number, message: string, detail?: unknown): void {
  const envelope: ApiEnvelope<never> = {
    success: false,
    error: message,
    ...(detail !== undefined ? { detail } : {}),
  };
  res.status(statusCode).json(envelope);
}
