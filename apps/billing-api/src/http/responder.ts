// Typed HTTP response helpers — success, paginated, and error envelopes.

import type { Response } from "express";
import { buildProblem } from "./problem.js";

export interface PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly hasMore: boolean;
}

export function respondOk<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export function respondCreated<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

export function respondNoContent(res: Response): void {
  res.status(204).end();
}

export function respondPaginated<T>(
  res: Response,
  data: readonly T[],
  meta: PaginationMeta,
): void {
  res.status(200).json({ success: true, data, meta });
}

export function respondError(
  res: Response,
  statusCode: number,
  code: string,
  detail: string,
  instance?: string,
  extensions?: Record<string, unknown>,
): void {
  const problem = buildProblem(statusCode, code, detail, instance, extensions);
  res.status(statusCode).contentType("application/problem+json").json(problem);
}
