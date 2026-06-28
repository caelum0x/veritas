// Domain-specific errors for the onboarding module.
import { AppError } from "@veritas/core";

export class FlowNotFoundError extends AppError {
  constructor(flowId: string) {
    super("NOT_FOUND", 404, `Onboarding flow not found: ${flowId}`);
    this.name = "FlowNotFoundError";
  }
}

export class StepNotFoundError extends AppError {
  constructor(stepId: string) {
    super("NOT_FOUND", 404, `Onboarding step not found: ${stepId}`);
    this.name = "StepNotFoundError";
  }
}

export class TemplateNotFoundError extends AppError {
  constructor(templateId: string) {
    super("NOT_FOUND", 404, `Onboarding template not found: ${templateId}`);
    this.name = "TemplateNotFoundError";
  }
}

export class FlowAlreadyCompletedError extends AppError {
  constructor(flowId: string) {
    super("CONFLICT", 409, `Onboarding flow already completed: ${flowId}`);
    this.name = "FlowAlreadyCompletedError";
  }
}

export class FlowAbandonedError extends AppError {
  constructor(flowId: string) {
    super("CONFLICT", 409, `Onboarding flow is abandoned: ${flowId}`);
    this.name = "FlowAbandonedError";
  }
}

export class StepNotSkippableError extends AppError {
  constructor(stepId: string) {
    super("VALIDATION", 422, `Step is not skippable: ${stepId}`);
    this.name = "StepNotSkippableError";
  }
}

export class InvalidFlowTransitionError extends AppError {
  constructor(from: string, to: string) {
    super("VALIDATION", 422, `Invalid flow transition: ${from} -> ${to}`);
    this.name = "InvalidFlowTransitionError";
  }
}
