// Auth-specific error types extending AppError hierarchy

import { AppError, UnauthorizedError, ForbiddenError, RateLimitedError } from "@veritas/core";

export class InvalidApiKeyError extends UnauthorizedError {
  constructor(detail?: string) {
    super({ message: detail ?? "The provided API key is invalid or malformed" });
    this.name = "InvalidApiKeyError";
  }
}

export class ExpiredApiKeyError extends UnauthorizedError {
  constructor(detail?: string) {
    super({ message: detail ?? "The provided API key has expired" });
    this.name = "ExpiredApiKeyError";
  }
}

export class RevokedApiKeyError extends UnauthorizedError {
  constructor(detail?: string) {
    super({ message: detail ?? "The provided API key has been revoked" });
    this.name = "RevokedApiKeyError";
  }
}

export class MissingCredentialsError extends UnauthorizedError {
  constructor(detail?: string) {
    super({ message: detail ?? "No authentication credentials were provided" });
    this.name = "MissingCredentialsError";
  }
}

export class InvalidSignatureError extends UnauthorizedError {
  constructor(detail?: string) {
    super({ message: detail ?? "Request signature verification failed" });
    this.name = "InvalidSignatureError";
  }
}

export class SignatureExpiredError extends UnauthorizedError {
  constructor(detail?: string) {
    super({ message: detail ?? "Request signature has expired" });
    this.name = "SignatureExpiredError";
  }
}

export class InvalidTokenError extends UnauthorizedError {
  constructor(detail?: string) {
    super({ message: detail ?? "The provided session token is invalid" });
    this.name = "InvalidTokenError";
  }
}

export class ExpiredTokenError extends UnauthorizedError {
  constructor(detail?: string) {
    super({ message: detail ?? "The provided session token has expired" });
    this.name = "ExpiredTokenError";
  }
}

export class InsufficientScopeError extends ForbiddenError {
  readonly requiredScopes: readonly string[];

  constructor(requiredScopes: readonly string[], detail?: string) {
    super({
      message:
        detail ??
        `Insufficient scope. Required: ${requiredScopes.join(", ")}`,
    });
    this.name = "InsufficientScopeError";
    this.requiredScopes = requiredScopes;
  }
}

export class IpDeniedError extends ForbiddenError {
  readonly ip: string;

  constructor(ip: string, detail?: string) {
    super({ message: detail ?? `Access denied for IP address: ${ip}` });
    this.name = "IpDeniedError";
    this.ip = ip;
  }
}

export class AuthRateLimitedError extends RateLimitedError {
  constructor(retryAfterSeconds?: number) {
    super({
      message:
        retryAfterSeconds !== undefined
          ? `Authentication rate limit exceeded. Retry after ${retryAfterSeconds}s`
          : "Authentication rate limit exceeded",
      retryAfterSeconds,
    });
    this.name = "AuthRateLimitedError";
  }
}

export type AuthError =
  | InvalidApiKeyError
  | ExpiredApiKeyError
  | RevokedApiKeyError
  | MissingCredentialsError
  | InvalidSignatureError
  | SignatureExpiredError
  | InvalidTokenError
  | ExpiredTokenError
  | InsufficientScopeError
  | IpDeniedError
  | AuthRateLimitedError;

export function isAuthError(e: unknown): e is AuthError {
  return (
    e instanceof InvalidApiKeyError ||
    e instanceof ExpiredApiKeyError ||
    e instanceof RevokedApiKeyError ||
    e instanceof MissingCredentialsError ||
    e instanceof InvalidSignatureError ||
    e instanceof SignatureExpiredError ||
    e instanceof InvalidTokenError ||
    e instanceof ExpiredTokenError ||
    e instanceof InsufficientScopeError ||
    e instanceof IpDeniedError ||
    e instanceof AuthRateLimitedError
  );
}
