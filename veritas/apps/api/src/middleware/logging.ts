// HTTP request/response logging middleware using @veritas/observability Logger.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

export function loggingMiddleware(logger: Logger) {
  return function (req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const level      = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      logger[level]("http.request", {
        requestId:     req.requestId,
        method:        req.method,
        path:          req.path,
        statusCode:    res.statusCode,
        durationMs,
        userAgent:     req.headers["user-agent"] ?? "",
        contentLength: res.getHeader("content-length") ?? 0,
        ip:            req.ip ?? req.socket.remoteAddress ?? "unknown",
      });
    });
    next();
  };
}
