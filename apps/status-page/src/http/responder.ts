// Typed HTTP response helpers for consistent JSON envelope format.
import type { Response } from "express";
import type { ApiPage, PageMeta } from "@veritas/core";
import { apiSuccess, apiFailure, apiPage } from "@veritas/core";

export function sendOk<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json(apiSuccess(data));
}

export function sendCreated<T>(res: Response, data: T): void {
  sendOk(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}

export function sendPage<T>(
  res: Response,
  items: T[],
  meta: PageMeta,
): void {
  const page: ApiPage<T> = apiPage(items, meta);
  res.status(200).json(page);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
): void {
  res.status(statusCode).json(apiFailure({ code: code as import("@veritas/core").ErrorCode, message }));
}

export function sendNotFound(res: Response, resource: string, id?: string): void {
  const message = id ? `${resource} '${id}' not found` : `${resource} not found`;
  sendError(res, 404, "NOT_FOUND", message);
}

export function sendBadRequest(res: Response, message: string): void {
  sendError(res, 400, "BAD_REQUEST", message);
}

export function sendInternalError(res: Response, message = "Internal server error"): void {
  sendError(res, 500, "INTERNAL_ERROR", message);
}
