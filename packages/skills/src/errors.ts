// Domain errors for the skills package.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class SkillNotFoundError extends AppError {
  constructor(skillId: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Skill not found: ${skillId}`, opts);
  }
}

export class SkillValidationError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("VALIDATION", 400, message, opts);
  }
}

export class SkillInvocationError extends AppError {
  constructor(skillId: string, cause: unknown, opts?: AppErrorOptions) {
    const msg =
      cause instanceof Error
        ? `Skill '${skillId}' invocation failed: ${cause.message}`
        : `Skill '${skillId}' invocation failed`;
    super("INTERNAL", 500, msg, { ...opts, cause });
  }
}

export class SkillAlreadyRegisteredError extends AppError {
  constructor(skillId: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, `Skill already registered: ${skillId}`, opts);
  }
}
