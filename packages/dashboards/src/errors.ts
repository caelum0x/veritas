// Domain errors for the dashboards package.
import { AppError } from "@veritas/core";

export class DashboardNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Dashboard not found: ${id}`);
  }
}

export class WidgetNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Widget not found: ${id}`);
  }
}

export class DashboardValidationError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 422, `Dashboard validation error: ${detail}`);
  }
}

export class DashboardConflictError extends AppError {
  constructor(detail: string) {
    super("CONFLICT", 409, `Dashboard conflict: ${detail}`);
  }
}

export class LayoutConflictError extends AppError {
  constructor(detail: string) {
    super("CONFLICT", 409, `Layout conflict: ${detail}`);
  }
}

export class FilterBindingError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 422, `Filter binding error: ${detail}`);
  }
}

export class SnapshotNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Snapshot not found: ${id}`);
  }
}

export class ShareTokenInvalidError extends AppError {
  constructor(token: string) {
    super("UNAUTHORIZED", 401, `Share token invalid or expired: ${token}`);
  }
}

export class RefreshPolicyError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 422, `Refresh policy error: ${detail}`);
  }
}
