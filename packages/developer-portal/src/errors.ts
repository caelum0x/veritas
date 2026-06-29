// Developer portal domain errors — typed error constructors for portal operations
import { AppError } from "@veritas/core";

export class AppNotFoundError extends AppError {
  constructor(appId: string) {
    super("NOT_FOUND", 404, `Developer app not found: ${appId}`);
  }
}

export class AppSuspendedError extends AppError {
  constructor(appId: string) {
    super("FORBIDDEN", 403, `Developer app is suspended: ${appId}`);
  }
}

export class AppDeletedError extends AppError {
  constructor(appId: string) {
    super("FORBIDDEN", 403, `Developer app has been deleted: ${appId}`);
  }
}

export class ApiKeyNotFoundError extends AppError {
  constructor(keyId: string) {
    super("NOT_FOUND", 404, `API key not found: ${keyId}`);
  }
}

export class ApiKeyRevokedError extends AppError {
  constructor(keyId: string) {
    super("FORBIDDEN", 403, `API key has been revoked: ${keyId}`);
  }
}

export class ApiKeyExpiredError extends AppError {
  constructor(keyId: string) {
    super("FORBIDDEN", 403, `API key has expired: ${keyId}`);
  }
}

export class QuotaExceededError extends AppError {
  constructor(appId: string, metric: string) {
    super("RATE_LIMITED", 429, `Quota exceeded for app ${appId} on metric: ${metric}`);
  }
}

export class WebhookNotFoundError extends AppError {
  constructor(webhookId: string) {
    super("NOT_FOUND", 404, `Webhook config not found: ${webhookId}`);
  }
}

export class TeamMemberNotFoundError extends AppError {
  constructor(userId: string) {
    super("NOT_FOUND", 404, `Team member not found: ${userId}`);
  }
}

export class DuplicateTeamMemberError extends AppError {
  constructor(userId: string) {
    super("CONFLICT", 409, `User is already a team member: ${userId}`);
  }
}

export class EnvironmentNotFoundError extends AppError {
  constructor(envId: string) {
    super("NOT_FOUND", 404, `Environment not found: ${envId}`);
  }
}

export class PortalValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION", 422, message);
  }
}
