import type { Logger } from '@croo-network/sdk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Structured JSON logger. Implements the CROO SDK `Logger` interface so it can
 * be handed straight to `new AgentClient(config, key)` for unified logging.
 */
export function createLogger(level: LogLevel = 'info'): Logger {
  const threshold = LEVEL_RANK[level];

  const emit = (lvl: LogLevel, message: string, args: unknown[]): void => {
    if (LEVEL_RANK[lvl] < threshold) return;
    const record: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level: lvl,
      msg: message,
    };
    if (args.length === 1 && isPlainObject(args[0])) {
      Object.assign(record, args[0]);
    } else if (args.length > 0) {
      record.detail = args.length === 1 ? args[0] : args;
    }
    const line = JSON.stringify(record);
    if (lvl === 'error' || lvl === 'warn') process.stderr.write(line + '\n');
    else process.stdout.write(line + '\n');
  };

  return {
    debug: (message, ...args) => emit('debug', message, args),
    info: (message, ...args) => emit('info', message, args),
    warn: (message, ...args) => emit('warn', message, args),
    error: (message, ...args) => emit('error', message, args),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
