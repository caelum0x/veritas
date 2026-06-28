// Email-specific error types for the Veritas email package

import { AppError } from "@veritas/core";

export type EmailErrorCode =
  | "EMAIL_SEND_FAILED"
  | "EMAIL_INVALID_ADDRESS"
  | "EMAIL_TEMPLATE_NOT_FOUND"
  | "EMAIL_RENDER_FAILED"
  | "EMAIL_TRANSPORT_UNAVAILABLE"
  | "EMAIL_RATE_LIMITED"
  | "EMAIL_ATTACHMENT_TOO_LARGE";

export class EmailError extends AppError {
  readonly emailCode: EmailErrorCode;

  constructor(emailCode: EmailErrorCode, message: string, cause?: unknown) {
    super("UNAVAILABLE", 503, message, { cause });
    this.emailCode = emailCode;
    this.name = "EmailError";
  }
}

export function emailSendFailed(message: string, cause?: unknown): EmailError {
  return new EmailError("EMAIL_SEND_FAILED", message, cause);
}

export function emailInvalidAddress(address: string): EmailError {
  return new EmailError("EMAIL_INVALID_ADDRESS", `Invalid email address: ${address}`);
}

export function emailTemplateNotFound(templateName: string): EmailError {
  return new EmailError("EMAIL_TEMPLATE_NOT_FOUND", `Email template not found: ${templateName}`);
}

export function emailRenderFailed(templateName: string, cause?: unknown): EmailError {
  return new EmailError("EMAIL_RENDER_FAILED", `Failed to render template: ${templateName}`, cause);
}

export function emailTransportUnavailable(transportName: string, cause?: unknown): EmailError {
  return new EmailError(
    "EMAIL_TRANSPORT_UNAVAILABLE",
    `Email transport unavailable: ${transportName}`,
    cause
  );
}
