// Parses and attaches pagination parameters (limit, cursor) from query string to every request.
import type { Request, RequestHandler } from "express";
import { toPageRequest, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PageRequest } from "@veritas/core";

declare global {
  namespace Express {
    interface Request {
      pagination: PageRequest;
    }
  }
}

export function pagination(): RequestHandler {
  return (req, res, next) => {
    const rawLimit  = req.query["limit"];
    const rawCursor = req.query["cursor"];

    const limitStr  = Array.isArray(rawLimit)  ? (rawLimit[0]  as string | undefined) : typeof rawLimit  === "string" ? rawLimit  : undefined;
    const cursorStr = Array.isArray(rawCursor) ? (rawCursor[0] as string | undefined) : typeof rawCursor === "string" ? rawCursor : undefined;

    const parsedLimit = limitStr !== undefined ? parseInt(limitStr, 10) : DEFAULT_PAGE_SIZE;
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      res.status(400).json({ success: false, error: { code: "INVALID_PAGINATION", message: "`limit` must be a positive integer." } });
      return;
    }

    const pageRequest = toPageRequest({ limit: Math.min(parsedLimit, MAX_PAGE_SIZE), cursor: cursorStr });
    req.pagination    = { limit: pageRequest.limit, cursor: pageRequest.cursor };
    next();
  };
}

export const parsePagination: RequestHandler = (req, res, next) => pagination()(req, res, next);

export function getPagination(req: Request): { limit: number; cursor?: string } {
  return req.pagination ?? { limit: DEFAULT_PAGE_SIZE };
}
