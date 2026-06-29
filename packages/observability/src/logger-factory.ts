// Factory function to create configured Logger instances with optional bindings.

import { LogLevel, parseLogLevel } from "./log-level.js";
import { Logger, ConsoleLogger, LogFields } from "./logger.js";

export interface LoggerOptions {
  /** Minimum log level; defaults to "info". Accepts env-style strings. */
  level?: LogLevel | string;
  /** Static fields merged into every log entry produced by this logger. */
  bindings?: LogFields;
}

/**
 * Creates a new structured logger.  The `level` may be given as a `LogLevel`
 * enum value or as a raw string (e.g. `process.env.LOG_LEVEL`).
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const { level: rawLevel = LogLevel.Info, bindings = {} } = options;
  const level =
    typeof rawLevel === "string" && !Object.values(LogLevel).includes(rawLevel as LogLevel)
      ? parseLogLevel(rawLevel)
      : (rawLevel as LogLevel);

  return new ConsoleLogger(level, bindings);
}

/**
 * Creates a logger from environment variables.
 * Reads LOG_LEVEL from process.env, falling back to "info".
 */
export function createLoggerFromEnv(bindings?: LogFields): Logger {
  const raw =
    typeof process !== "undefined" ? (process.env["LOG_LEVEL"] ?? "info") : "info";
  return createLogger({ level: parseLogLevel(raw), bindings });
}
