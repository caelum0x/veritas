// Guardrail-specific error types extending AppError from @veritas/core.
import { AppError } from "@veritas/core";
import type { AppErrorOptions } from "@veritas/core";

export class GuardrailBlockedError extends AppError {
  constructor(
    readonly guardrailId: string,
    readonly reason: string,
    opts?: Partial<AppErrorOptions>,
  ) {
    super("FORBIDDEN", 403, `Guardrail [${guardrailId}] blocked request: ${reason}`, opts ?? {});
  }
}

export class GuardrailConfigError extends AppError {
  constructor(message: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, message, opts ?? {});
  }
}

export class GuardrailTimeoutError extends AppError {
  constructor(guardrailId: string, opts?: Partial<AppErrorOptions>) {
    super("UNAVAILABLE", 503, `Guardrail [${guardrailId}] timed out`, opts ?? {});
  }
}
