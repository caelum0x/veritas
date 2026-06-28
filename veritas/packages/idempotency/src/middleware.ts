// Express middleware enforcing idempotency via key-based request deduplication.
import { type Request, type Response, type NextFunction } from "express";
import { type IdempotencyStore } from "./store.js";
import {
  parseIdempotencyKey,
  extractKeyFromHeaders,
  IDEMPOTENCY_KEY_HEADER,
} from "./key.js";
import { computeFingerprint, fingerprintFromRequest } from "./fingerprint.js";
import {
  createInFlightRecord,
  completeRecord,
  failRecord,
  IdempotencyStatus,
} from "./record.js";

export interface IdempotencyMiddlewareOptions {
  readonly store: IdempotencyStore;
  /** HTTP methods that require idempotency enforcement (default: POST, PATCH) */
  readonly methods?: readonly string[];
  /** If true, requests without an idempotency key are rejected (default: false) */
  readonly requireKey?: boolean;
}

const DEFAULT_METHODS = ["POST", "PATCH"] as const;

/** Create Express middleware that enforces idempotency for mutating requests. */
export function createIdempotencyMiddleware(options: IdempotencyMiddlewareOptions) {
  const { store } = options;
  const methods = options.methods ?? DEFAULT_METHODS;
  const requireKey = options.requireKey ?? false;

  return async function idempotencyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const method = req.method.toUpperCase();
    if (!methods.includes(method)) {
      next();
      return;
    }

    const rawKey = extractKeyFromHeaders(req.headers as Record<string, string | string[] | undefined>);

    if (rawKey == null) {
      if (requireKey) {
        res.status(400).json({
          error: "missing_idempotency_key",
          message: `Header '${IDEMPOTENCY_KEY_HEADER}' is required for ${method} requests.`,
        });
        return;
      }
      next();
      return;
    }

    const keyResult = parseIdempotencyKey(rawKey);
    if (!keyResult.ok) {
      res.status(400).json({
        error: "invalid_idempotency_key",
        message: keyResult.error,
      });
      return;
    }

    const { normalized: key } = keyResult.value;
    const fingerprint = computeFingerprint(fingerprintFromRequest(req));
    const existing = await store.get(key);

    if (existing.some) {
      const record = existing.value;

      if (record.fingerprint !== fingerprint) {
        res.status(422).json({
          error: "idempotency_key_reuse",
          message: "This idempotency key was used with a different request.",
        });
        return;
      }

      if (record.status === IdempotencyStatus.InFlight) {
        res.status(409).json({
          error: "request_in_flight",
          message: "A request with this idempotency key is already being processed.",
        });
        return;
      }

      if (record.status === IdempotencyStatus.Completed) {
        res.set({ ...record.responseHeaders, "x-idempotent-replayed": "true" });
        res.status(record.statusCode ?? 200).json(record.responseBody);
        return;
      }
    }

    const inFlight = createInFlightRecord({
      key,
      fingerprint,
      requestPath: req.path,
      requestMethod: req.method,
    });
    await store.set(key, inFlight);

    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    let capturedStatusCode = 200;

    res.status = (code: number) => {
      capturedStatusCode = code;
      return originalStatus(code);
    };

    res.json = (body: unknown) => {
      const headers: Record<string, string> = {};
      const rawHeaders = res.getHeaders();
      for (const [k, v] of Object.entries(rawHeaders)) {
        if (typeof v === "string") headers[k] = v;
        else if (typeof v === "number") headers[k] = String(v);
      }

      const completed = completeRecord(inFlight, {
        statusCode: capturedStatusCode,
        responseBody: body,
        responseHeaders: headers,
      });

      store.set(key, completed).catch(() => {
        // best-effort; do not fail the response
      });

      return originalJson(body);
    };

    res.on("finish", () => {
      if (res.statusCode >= 500) {
        store.set(key, failRecord(inFlight)).catch(() => {});
      }
    });

    next();
  };
}
