// Logger port re-declared in core to avoid cross-package dependency cycles.

/** Severity levels in ascending order of importance. */
export const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/** Structured key/value context attached to a log line. */
export type LogContext = Readonly<Record<string, unknown>>;

/**
 * Minimal structured logger interface. Other packages depend on this port
 * rather than a concrete logging library, keeping core free of cycles.
 */
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** Return a child logger that merges `bindings` into every log line. */
  child(bindings: LogContext): Logger;
}

/** A logger that discards all output; handy as a default or in tests. */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLogger,
};
