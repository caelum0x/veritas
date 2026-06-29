// Typed error hierarchy for sdk-codegen failures
import { AppError, type AppErrorOptions } from "@veritas/core";

export class CodegenError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL" as never, 500, message, opts);
  }
}

export class UnsupportedTargetError extends CodegenError {
  readonly target: string;
  constructor(target: string, opts?: AppErrorOptions) {
    super(`Unsupported codegen target: ${target}`, opts);
    this.target = target;
  }
}

export class InvalidSchemaError extends CodegenError {
  readonly path: string;
  constructor(path: string, detail: string, opts?: AppErrorOptions) {
    super(`Invalid schema at ${path}: ${detail}`, opts);
    this.path = path;
  }
}

export class TemplateRenderError extends CodegenError {
  readonly templateName: string;
  constructor(templateName: string, detail: string, opts?: AppErrorOptions) {
    super(`Template render failed for ${templateName}: ${detail}`, opts);
    this.templateName = templateName;
  }
}

export class NamingError extends CodegenError {
  readonly identifier: string;
  constructor(identifier: string, detail: string, opts?: AppErrorOptions) {
    super(`Naming error for "${identifier}": ${detail}`, opts);
    this.identifier = identifier;
  }
}
