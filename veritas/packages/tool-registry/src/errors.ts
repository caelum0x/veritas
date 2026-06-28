// Domain errors for the tool-registry package.

import { AppError } from "@veritas/core";

export class ToolNotFoundError extends AppError {
  constructor(toolId: string) {
    super("NOT_FOUND", 404, `Tool not found: ${toolId}`);
  }
}

export class ToolAlreadyRegisteredError extends AppError {
  constructor(toolId: string) {
    super("CONFLICT", 409, `Tool already registered: ${toolId}`);
  }
}

export class ToolVersionConflictError extends AppError {
  constructor(toolId: string, version: string) {
    super("CONFLICT", 409, `Version ${version} already exists for tool: ${toolId}`);
  }
}

export class InvalidToolDescriptorError extends AppError {
  constructor(details: string) {
    super("VALIDATION", 400, `Invalid tool descriptor: ${details}`);
  }
}

export class ToolPermissionDeniedError extends AppError {
  constructor(toolId: string, permission: string) {
    super("FORBIDDEN", 403, `Permission '${permission}' denied for tool: ${toolId}`);
  }
}
