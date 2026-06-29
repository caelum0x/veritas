// Uniform JSON envelope helpers for admin-api responses.
import type { Response } from "express";
import { apiSuccess, apiFailure, apiPage } from "@veritas/core";
import type { PageMeta, ErrorCode } from "@veritas/core";

export function sendOk<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json(apiSuccess(data));
}

export function sendCreated<T>(res: Response, data: T): void {
  sendOk(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}

export function sendPage<T>(res: Response, items: readonly T[], meta: PageMeta): void {
  res.status(200).json(apiPage(items, meta));
}

export function sendError(
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): void {
  res.status(statusCode).json(
    apiFailure({
      code,
      message,
      details: details as Record<string, unknown> | undefined,
    }),
  );
}
