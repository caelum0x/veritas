// Typed HTTP response helpers used by controllers.

import type { Response } from "express";
import { toApiError } from "./api-error.js";
import { problem } from "./problem.js";

/** Send a 200 OK JSON response. */
export function ok<T>(res: Response, data: T): void {
  res.status(200).json({ success: true, data });
}

/** Send a 201 Created JSON response. */
export function created<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

/** Send a 204 No Content response. */
export function noContent(res: Response): void {
  res.status(204).end();
}

/** Send a 400 Bad Request problem response. */
export function badRequest(res: Response, detail?: string): void {
  res.status(400).json(problem(400, "Bad Request", detail));
}

/** Send a 401 Unauthorized problem response. */
export function unauthorized(res: Response, detail?: string): void {
  res.status(401).json(problem(401, "Unauthorized", detail));
}

/** Send a 403 Forbidden problem response. */
export function forbidden(res: Response, detail?: string): void {
  res.status(403).json(problem(403, "Forbidden", detail));
}

/** Send a 404 Not Found problem response. */
export function notFound(res: Response, detail?: string): void {
  res.status(404).json(problem(404, "Not Found", detail));
}

/** Send a 409 Conflict problem response. */
export function conflict(res: Response, detail?: string): void {
  res.status(409).json(problem(409, "Conflict", detail));
}

/** Send a 429 Too Many Requests problem response. */
export function tooManyRequests(res: Response, detail?: string): void {
  res.status(429).json(problem(429, "Too Many Requests", detail));
}

/** Send an error response derived from any thrown value. */
export function sendError(res: Response, err: unknown): void {
  const { status, body } = toApiError(err);
  res.status(status).json(body);
}

/** Paginated list response. */
export function paginated<T>(
  res: Response,
  data: readonly T[],
  meta: { total: number; page: number; limit: number }
): void {
  res.status(200).json({ success: true, data, meta });
}
