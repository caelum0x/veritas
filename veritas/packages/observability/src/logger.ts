// Pino-style structured logger interface and console-based implementation.

import { LogLevel, isLevelEnabled } from "./log-level.js";

export type LogFields = Record<string, unknown>;

export interface Logger {
  readonly level: LogLevel;
  trace(msg: string, fields?: LogFields): void;
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  fatal(msg: string, fields?: LogFields): void;
  /** Return a child logger that merges `bindings` into every log line. */
  child(bindings: LogFields): Logger;
}

function serialize(fields: LogFields): string {
  try {
    return JSON.stringify(fields);
  } catch {
    return "[unserializable]";
  }
}

function emit(
  level: LogLevel,
  threshold: LogLevel,
  msg: string,
  fields: LogFields,
): void {
  if (!isLevelEnabled(threshold, level)) return;

  const entry: LogFields = {
    level,
    time: new Date().toISOString(),
    msg,
    ...fields,
  };

  const line = serialize(entry);
  if (level === LogLevel.Error || level === LogLevel.Fatal) {
    console.error(line);
  } else if (level === LogLevel.Warn) {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export class ConsoleLogger implements Logger {
  readonly level: LogLevel;
  private readonly bindings: LogFields;

  constructor(level: LogLevel, bindings: LogFields = {}) {
    this.level = level;
    this.bindings = bindings;
  }

  private log(level: LogLevel, msg: string, fields: LogFields = {}): void {
    emit(level, this.level, msg, { ...this.bindings, ...fields });
  }

  trace(msg: string, fields?: LogFields): void { this.log(LogLevel.Trace, msg, fields); }
  debug(msg: string, fields?: LogFields): void { this.log(LogLevel.Debug, msg, fields); }
  info(msg: string, fields?: LogFields): void { this.log(LogLevel.Info, msg, fields); }
  warn(msg: string, fields?: LogFields): void { this.log(LogLevel.Warn, msg, fields); }
  error(msg: string, fields?: LogFields): void { this.log(LogLevel.Error, msg, fields); }
  fatal(msg: string, fields?: LogFields): void { this.log(LogLevel.Fatal, msg, fields); }

  child(bindings: LogFields): Logger {
    return new ConsoleLogger(this.level, { ...this.bindings, ...bindings });
  }
}

/** A no-op logger that discards all output — useful for tests or silent contexts. */
export const noopLogger: Logger = {
  level: LogLevel.Silent,
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  fatal: () => undefined,
  child: () => noopLogger,
};
