// Dependency port interfaces shared across all lifecycle flows.
import { type Clock, type UserId } from "@veritas/core";
import { type Logger } from "@veritas/observability";
import { type Trial, type TrialId } from "@veritas/trials";
import { type OnboardingFlow } from "@veritas/onboarding";
import { type LifecycleStore } from "@veritas/lifecycle";
import { type CreditStore, type CreditNotifier } from "@veritas/credits";
import { type ChurnStore } from "@veritas/churn";

export interface TrialRepository {
  findActiveTrialByUser(userId: UserId): Promise<Trial | null>;
  findTrial(trialId: string): Promise<Trial | null>;
  saveTrial(trial: Trial): Promise<void>;
}

export interface OnboardingRepository {
  getFlow(flowId: string): Promise<OnboardingFlow | null>;
  saveFlow(flow: OnboardingFlow): Promise<void>;
}

export interface SubscriptionRecord {
  readonly id: string;
  readonly userId: UserId;
  readonly planId: string;
  readonly status: "active";
  readonly startedAt: string;
  readonly trialId: string;
}

export interface SubscriptionRepository {
  saveSubscription(sub: SubscriptionRecord): Promise<void>;
}

export interface LifecycleFlowDeps {
  readonly trialRepo: TrialRepository;
  readonly onboardingRepo: OnboardingRepository;
  readonly subscriptionRepo: SubscriptionRepository;
  readonly lifecycleStore: LifecycleStore;
  readonly creditStore: CreditStore;
  readonly churnStore: ChurnStore;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly creditNotifier?: CreditNotifier;
}
