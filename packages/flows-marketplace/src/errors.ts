// Domain errors for @veritas/flows-marketplace flows.

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Raised when an agent identity cannot be registered during onboarding. */
export class AgentOnboardingError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("INTERNAL", 500, message, options as AppErrorOptions);
    this.name = "AgentOnboardingError";
  }
}

/** Raised when a marketplace listing cannot be created or published. */
export class ListingPublishError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("INTERNAL", 500, message, options as AppErrorOptions);
    this.name = "ListingPublishError";
  }
}

/** Raised when service discovery or hire fails. */
export class DiscoverHireError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("INTERNAL", 500, message, options as AppErrorOptions);
    this.name = "DiscoverHireError";
  }
}

/** Raised when a review submission or reputation update fails. */
export class ReviewFlowError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("INTERNAL", 500, message, options as AppErrorOptions);
    this.name = "ReviewFlowError";
  }
}

/** Raised when a reputation score update from an order outcome fails. */
export class ReputationUpdateError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("INTERNAL", 500, message, options as AppErrorOptions);
    this.name = "ReputationUpdateError";
  }
}
