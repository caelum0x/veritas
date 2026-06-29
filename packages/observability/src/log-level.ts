// LogLevel enum and numeric ranking for log filtering decisions.

export enum LogLevel {
  Trace = "trace",
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
  Fatal = "fatal",
  Silent = "silent",
}

const LEVEL_RANK: Record<LogLevel, number> = {
  [LogLevel.Trace]: 0,
  [LogLevel.Debug]: 1,
  [LogLevel.Info]: 2,
  [LogLevel.Warn]: 3,
  [LogLevel.Error]: 4,
  [LogLevel.Fatal]: 5,
  [LogLevel.Silent]: 6,
};

/** Returns true when `candidate` is at or above the `threshold` level. */
export function isLevelEnabled(threshold: LogLevel, candidate: LogLevel): boolean {
  return LEVEL_RANK[candidate] >= LEVEL_RANK[threshold];
}

/** Parses an arbitrary string into a LogLevel, defaulting to Info on failure. */
export function parseLogLevel(raw: string): LogLevel {
  const normalized = raw.toLowerCase() as LogLevel;
  return Object.values(LogLevel).includes(normalized) ? normalized : LogLevel.Info;
}
