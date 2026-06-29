// Middleware helper that verifies HMAC signatures on inbound webhook requests.

import type { Request, Response, NextFunction } from "express";
import { verifySignature } from "@veritas/webhooks";
import { MissingHeaderError } from "./errors.js";

export interface SignatureVerifyOptions {
  secret: string;
  maxAgeMs?: number;
  signatureHeader?: string;
}

/**
 * Returns an Express middleware that verifies the webhook signature.
 * On failure, responds with 401 or 400 and does not call next().
 */
export function signatureVerifyMiddleware(opts: SignatureVerifyOptions) {
  const headerName = opts.signatureHeader ?? "x-veritas-signature";

  return (req: Request, res: Response, next: NextFunction): void => {
    const sigHeader = req.headers[headerName];

    if (typeof sigHeader !== "string" || sigHeader.length === 0) {
      const e = new MissingHeaderError(headerName);
      res.status(e.status).json({ error: e.message });
      return;
    }

    const raw: unknown = (req as Request & { rawBody?: string }).rawBody;
    const body = typeof raw === "string" ? raw : JSON.stringify(req.body ?? {});

    const result = verifySignature(
      { signatureHeader: sigHeader, body, secret: opts.secret },
      { maxAgeMs: opts.maxAgeMs },
    );

    if (!result.ok) {
      res.status(401).json({ error: `Signature verification failed: ${result.error}` });
      return;
    }

    next();
  };
}
