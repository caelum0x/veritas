// Reporting-domain error constructors wrapping AppError subtypes.
import { AppError, NotFoundError, ConflictError, ValidationError } from "@veritas/core";
import type { ReportId, TemplateId, ScheduleId } from "./report.js";

export function reportNotFound(id: ReportId): NotFoundError {
  return new NotFoundError({ message: `Report not found: ${id}`, details: { id } });
}

export function templateNotFound(id: TemplateId): NotFoundError {
  return new NotFoundError({ message: `Report template not found: ${id}`, details: { id } });
}

export function scheduleNotFound(id: ScheduleId): NotFoundError {
  return new NotFoundError({ message: `Report schedule not found: ${id}`, details: { id } });
}

export function reportConflict(title: string): ConflictError {
  return new ConflictError({
    message: `A report with title "${title}" already exists in this context.`,
    details: { title },
  });
}

export function reportValidationError(field: string, message: string): ValidationError {
  return new ValidationError({
    message: `Validation failed for report field "${field}": ${message}`,
    details: { field, message },
  });
}

export function invalidParametersError(details: string): ValidationError {
  return new ValidationError({
    message: `Report parameters are invalid: ${details}`,
    details: { details },
  });
}

export function reportNotReady(id: ReportId, status: string): AppError {
  return new AppError("UNAVAILABLE", 503, `Report ${id} is not ready for delivery (status: ${status}).`, {
    details: { id, status },
  });
}

export function exportUnsupportedFormat(format: string): AppError {
  return new AppError("VALIDATION", 422, `Export format "${format}" is not supported.`, {
    details: { format },
  });
}
