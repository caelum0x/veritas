// request-id middleware: assigns a unique X-Request-ID to every incoming request.

import type { Request, Response, NextFunction } from "express";

const REQUEST_ID_HEADER = "x-request-id";

/** Attaches a request ID to every request, echoing it back in the response. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers[REQUEST_ID_HEADER] as string | undefined;
  const id = existing ?? crypto.randomUUID();
  // Expose on request for downstream use.
  (req as Request & { id: string }).id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}
