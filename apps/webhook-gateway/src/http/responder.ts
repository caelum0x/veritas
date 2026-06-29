// Type-safe HTTP response helpers for consistent API envelope format.

import type { Response } from "express";
import { toProblemDetail } from "./problem.js";

export function sendOk<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export function sendCreated<T>(res: Response, data: T): void {
  sendOk(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: { total: number; page: number; limit: number },
): void {
  res.status(200).json({ success: true, data, meta });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  detail: string,
  extensions?: Record<string, unknown>,
): void {
  const problem = toProblemDetail(status, code, detail, extensions);
  res.status(status).json(problem);
}
