// errors.ts: typed error hierarchy for the CDC module
import { AppError } from "@veritas/core";

/** CDC-specific error codes covering all pipeline stages */
export type CdcErrorCode =
  | "CAPTURE_FAILED"
  | "PUBLISH_FAILED"
  | "SUBSCRIBE_FAILED"
  | "TRANSFORM_FAILED"
  | "DEDUPE_FAILED"
  | "PROJECTION_FAILED"
  | "RELAY_FAILED"
  | "STREAM_CLOSED"
  | "CURSOR_INVALID"
  | "INVALID_EVENT";

/** Structured error for any CDC pipeline failure */
export class CdcError extends AppError {
  readonly cdcCode: CdcErrorCode;

  constructor(
    code: CdcErrorCode,
    message: string,
    details: Record<string, unknown> = {},
    cause?: unknown,
  ) {
    super("INTERNAL", 500, message, { details: { cdcCode: code, ...details }, cause });
    this.name = "CdcError";
    this.cdcCode = code;
  }
}

/** Factory to create a CdcError without `new` */
export const cdcError = (
  code: CdcErrorCode,
  message: string,
  details: Record<string, unknown> = {},
  cause?: unknown,
): CdcError => new CdcError(code, message, details, cause);

/** Type guard for CdcError */
export const isCdcError = (e: unknown): e is CdcError => e instanceof CdcError;
