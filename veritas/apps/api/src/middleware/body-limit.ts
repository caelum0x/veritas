// Middleware to enforce a maximum request body size limit.
import type { RequestHandler } from "express";

const DEFAULT_LIMIT = "1mb";

/** Returns express middleware that rejects bodies exceeding the given size. */
export function bodyLimit(limit: string = DEFAULT_LIMIT): RequestHandler {
  // Express's built-in json/urlencoded parsers handle the limit option;
  // this middleware enforces a raw byte limit for any remaining cases
  // by checking content-length and rejecting early.
  return (req, res, next) => {
    const contentLength = req.headers["content-length"];
    if (contentLength !== undefined) {
      const bytes = parseInt(contentLength, 10);
      const maxBytes = parseBytes(limit);
      if (!isNaN(bytes) && maxBytes !== null && bytes > maxBytes) {
        res.status(413).json({
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `Request body exceeds the limit of ${limit}.`,
          },
        });
        return;
      }
    }
    next();
  };
}

/** Parse a human-readable byte string (e.g. "1mb", "512kb") into bytes. */
function parseBytes(limit: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(limit.trim());
  if (!match) return null;
  const value = parseFloat(match[1]!);
  const unit = (match[2] ?? "b").toLowerCase();
  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  return value * (multipliers[unit] ?? 1);
}
