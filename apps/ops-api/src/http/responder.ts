// HTTP responder helpers: send success envelopes, paginated lists, and 204 no-content.
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
