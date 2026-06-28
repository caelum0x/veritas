// Errors specific to the flows-lifecycle orchestration layer.

export class TrialEligibilityError extends Error {
  readonly code = "TRIAL_ELIGIBILITY_ERROR" as const;
  constructor(userId: string, reason: string) {
    super(`User ${userId} is not eligible for a trial: ${reason}`);
    this.name = "TrialEligibilityError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TrialConversionError extends Error {
  readonly code = "TRIAL_CONVERSION_ERROR" as const;
  constructor(trialId: string, reason: string) {
    super(`Cannot convert trial ${trialId}: ${reason}`);
    this.name = "TrialConversionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OnboardingFlowNotFoundError extends Error {
  readonly code = "ONBOARDING_FLOW_NOT_FOUND" as const;
  constructor(flowId: string) {
    super(`Onboarding flow not found: ${flowId}`);
    this.name = "OnboardingFlowNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OnboardingStepNotFoundError extends Error {
  readonly code = "ONBOARDING_STEP_NOT_FOUND" as const;
  constructor(stepId: string, flowId: string) {
    super(`Step ${stepId} not found in onboarding flow ${flowId}`);
    this.name = "OnboardingStepNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ChurnInterventionError extends Error {
  readonly code = "CHURN_INTERVENTION_ERROR" as const;
  constructor(userId: string, reason: string) {
    super(`Failed to trigger churn intervention for user ${userId}: ${reason}`);
    this.name = "ChurnInterventionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CreditGrantError extends Error {
  readonly code = "CREDIT_GRANT_ERROR" as const;
  constructor(userId: string, reason: string) {
    super(`Failed to grant credits to user ${userId}: ${reason}`);
    this.name = "CreditGrantError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type LifecycleFlowError =
  | TrialEligibilityError
  | TrialConversionError
  | OnboardingFlowNotFoundError
  | OnboardingStepNotFoundError
  | ChurnInterventionError
  | CreditGrantError;
