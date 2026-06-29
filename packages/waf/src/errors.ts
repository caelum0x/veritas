// WAF-specific error types extending AppError for structured error handling
import { AppError, type AppErrorOptions } from "@veritas/core";

export class WafRuleError extends AppError {
  readonly ruleId: string;

  constructor(ruleId: string, message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, message, options);
    this.ruleId = ruleId;
  }
}

export class WafBlockedError extends AppError {
  readonly ip: string;
  readonly ruleId: string | undefined;
  readonly reason: string;

  constructor(ip: string, reason: string, ruleId?: string, options?: AppErrorOptions) {
    super("FORBIDDEN", 403, `Request blocked: ${reason}`, options);
    this.ip = ip;
    this.ruleId = ruleId;
    this.reason = reason;
  }
}

export class WafRateLimitError extends AppError {
  readonly ip: string;
  readonly retryAfterMs: number;

  constructor(ip: string, retryAfterMs: number, options?: AppErrorOptions) {
    super("RATE_LIMITED", 429, `Rate limit exceeded for IP ${ip}`, options);
    this.ip = ip;
    this.retryAfterMs = retryAfterMs;
  }
}

export class WafGeoBlockError extends AppError {
  readonly countryCode: string;

  constructor(countryCode: string, options?: AppErrorOptions) {
    super("FORBIDDEN", 403, `Requests from country ${countryCode} are not allowed`, options);
    this.countryCode = countryCode;
  }
}

export class WafIpReputationError extends AppError {
  readonly ip: string;
  readonly score: number;

  constructor(ip: string, score: number, options?: AppErrorOptions) {
    super("FORBIDDEN", 403, `IP ${ip} has low reputation score ${score}`, options);
    this.ip = ip;
    this.score = score;
  }
}
