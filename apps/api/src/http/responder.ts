// Consistent JSON response helpers: success envelope, paginated results, and no-content replies.
import type { Response } from "express";
import {
  apiSuccess,
  apiPage,
  apiFailure,
  type Page,
  type ApiSuccess,
  type ApiPage,
  type ApiFailure,
  type PageMeta,
  type ErrorCode,
} from "@veritas/core";

export function respondOk<T>(res: Response, data: T): void {
  const body: ApiSuccess<T> = apiSuccess(data);
  res.status(200).json(body);
}

export function respondCreated<T>(res: Response, data: T): void {
  const body: ApiSuccess<T> = apiSuccess(data);
  res.status(201).json(body);
}

export function respondNoContent(res: Response): void {
  res.status(204).end();
}

export function respondPage<T>(res: Response, page: Page<T>): void {
  const meta: PageMeta = { nextCursor: page.nextCursor, hasMore: page.hasMore };
  const body: ApiPage<T> = apiPage(page.items, meta);
  res.status(200).json(body);
}

export function respondError(res: Response, status: number, code: string, message: string, fields?: Record<string, string[]>): void {
  const body: ApiFailure = apiFailure({ code: code as ErrorCode, message, details: fields ? { fields } : undefined });
  res.status(status).json(body);
}

export const responder = {
  ok<T>(res: Response, data: T): void { respondOk(res, data); },
  created<T>(res: Response, data: T): void { respondCreated(res, data); },
  noContent(res: Response): void { respondNoContent(res); },
  page<T>(res: Response, itemsOrPage: T[] | readonly T[] | Page<T>, meta?: PageMeta): void {
    if (meta !== undefined) {
      res.status(200).json(apiPage(itemsOrPage as readonly T[], meta));
    } else {
      respondPage(res, itemsOrPage as Page<T>);
    }
  },
  error(res: Response, status: number, code: string, message: string, fields?: Record<string, string[]>): void {
    respondError(res, status, code, message, fields);
  },
};

export function respond(res: Response, status: number, body: unknown): void {
  if (status === 204 || body === null || body === undefined) {
    res.status(status).end();
  } else {
    res.status(status).json(body);
  }
}
