// Responder: typed helpers for sending consistent JSON responses via Express.

import type { Response } from "express";

export function sendOk<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function sendCreated<T>(res: Response, data: T): void {
  sendOk(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}

export function sendPage<T>(
  res: Response,
  items: readonly T[],
  meta: { total: number; page: number; limit: number },
): void {
  res.status(200).json({ success: true, data: items, meta });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: Record<string, unknown> = { success: false, error: { code, message } };
  if (details !== undefined) body["details"] = details;
  res.status(status).json(body);
}
