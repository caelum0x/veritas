// Domain events emitted by lifecycle flows.
import { makeDomainEvent, type DomainEvent } from "@veritas/core";
import { type Trial } from "@veritas/trials";
import { type OnboardingFlow } from "@veritas/onboarding";
import { type Intervention, type RiskScore } from "@veritas/churn";
import { type CreditGrant } from "@veritas/credits";
import { type SubscriptionRecord } from "./deps.js";

export type TrialStartedEvent = DomainEvent<
  "lifecycle.trial.started",
  { readonly trial: Trial; readonly flow: OnboardingFlow }
>;

export type TrialConvertedEvent = DomainEvent<
  "lifecycle.trial.converted",
  { readonly trial: Trial; readonly subscription: SubscriptionRecord }
>;

export type OnboardingCompletedEvent = DomainEvent<
  "lifecycle.onboarding.completed",
  { readonly flow: OnboardingFlow }
>;

export type ChurnInterventionTriggeredEvent = DomainEvent<
  "lifecycle.churn.intervention_triggered",
  { readonly riskScore: RiskScore; readonly intervention: Intervention }
>;

export type CreditsGrantedEvent = DomainEvent<
  "lifecycle.credits.granted",
  { readonly grant: CreditGrant }
>;

export type LifecycleFlowEvent =
  | TrialStartedEvent
  | TrialConvertedEvent
  | OnboardingCompletedEvent
  | ChurnInterventionTriggeredEvent
  | CreditsGrantedEvent;

export function makeTrialStartedEvent(
  trial: Trial,
  flow: OnboardingFlow,
): TrialStartedEvent {
  return makeDomainEvent({ type: "lifecycle.trial.started", payload: { trial, flow } }) as TrialStartedEvent;
}

export function makeTrialConvertedEvent(
  trial: Trial,
  subscription: SubscriptionRecord,
): TrialConvertedEvent {
  return makeDomainEvent({ type: "lifecycle.trial.converted", payload: { trial, subscription } }) as TrialConvertedEvent;
}

export function makeOnboardingCompletedEvent(flow: OnboardingFlow): OnboardingCompletedEvent {
  return makeDomainEvent({ type: "lifecycle.onboarding.completed", payload: { flow } }) as OnboardingCompletedEvent;
}

export function makeChurnInterventionTriggeredEvent(
  riskScore: RiskScore,
  intervention: Intervention,
): ChurnInterventionTriggeredEvent {
  return makeDomainEvent({
    type: "lifecycle.churn.intervention_triggered",
    payload: { riskScore, intervention },
  }) as ChurnInterventionTriggeredEvent;
}

export function makeCreditsGrantedEvent(grant: CreditGrant): CreditsGrantedEvent {
  return makeDomainEvent({ type: "lifecycle.credits.granted", payload: { grant } }) as CreditsGrantedEvent;
}
