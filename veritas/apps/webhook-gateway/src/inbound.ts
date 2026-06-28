// Express middleware that captures raw request bodies needed for HMAC verification.

import type { Request, Response, NextFunction } from "express";

/** Extend the Express Request type to carry the raw body string. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}

/**
 * Body capture middleware — must be registered BEFORE express.json().
 * Reads the raw bytes and attaches them as `req.rawBody` so that the
 * signature verifier can re-compute the HMAC over the original bytes.
 */
export function rawBodyCapture(req: Request, _res: Response, next: NextFunction): void {
  const chunks: Buffer[] = [];

  req.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on("end", () => {
    req.rawBody = Buffer.concat(chunks).toString("utf8");
    next();
  });

  req.on("error", (err: Error) => {
    next(err);
  });
}
