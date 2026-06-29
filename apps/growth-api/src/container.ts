// Builds and wires all dependencies (services, stores, flows) for growth-api.
import { systemClock, type UserId } from "@veritas/core";
import {
  createLogger,
  MetricsRegistry,
  ConsoleAuditLogger,
  type Logger,
} from "@veritas/observability";
import {
  ApiKeyAuthenticator,
  createApiKeyHasher,
  type Authenticator,
  type ApiKeyStore,
} from "@veritas/auth";
import {
  InMemoryReferralStore,
  InMemoryTrackingStore,
  Tracker,
} from "@veritas/referrals";
import { InMemoryCouponStore, type CouponStore } from "@veritas/coupons";
import { InMemoryCampaignStore, type CampaignStore } from "@veritas/campaigns";
import { createInMemoryLifecycleStore, type LifecycleStore } from "@veritas/lifecycle";
import {
  startTrialFlow,
  convertTrialFlow,
  grantCreditsFlow,
  completeOnboardingStep,
  skipOnboardingStep,
  getOnboardingChecklist,
} from "@veritas/flows-lifecycle";
import type { Trial } from "@veritas/trials";
import type { OnboardingFlow } from "@veritas/onboarding";
import type { SubscriptionRecord } from "@veritas/flows-lifecycle";
import type { CreditStore } from "@veritas/credits";
import type { AppConfig } from "./config.js";

// Direct package imports for classes not re-exported from index
import { ReferralService } from "../../../packages/referrals/src/service.js";
import { InMemoryRedemptionStore, RedemptionService } from "../../../packages/referrals/src/redemption.js";
import { CreditService } from "../../../packages/credits/src/service.js";
import { InMemoryCreditStore } from "../../../packages/credits/src/store.js";

function makeInProcessApiKeyStore(): ApiKeyStore {
  return { async findByKeyId(_id: string) { return undefined; } };
}

function makeInMemoryTrialStore() {
  const trials = new Map<string, Trial>();
  return {
    async findActiveTrialByUser(userId: UserId): Promise<Trial | null> {
      for (const t of trials.values()) {
        if (t.userId === userId && (t.status === "active" || t.status === "extended")) return t;
      }
      return null;
    },
    async findTrial(trialId: string): Promise<Trial | null> {
      return trials.get(trialId) ?? null;
    },
    async saveTrial(trial: Trial): Promise<void> {
      trials.set(trial.id, trial);
    },
  };
}

function makeInMemoryOnboardingStore() {
  const flows = new Map<string, OnboardingFlow>();
  return {
    async getFlow(flowId: string): Promise<OnboardingFlow | null> {
      return flows.get(flowId) ?? null;
    },
    async saveFlow(flow: OnboardingFlow): Promise<void> {
      flows.set(flow.id, flow);
    },
  };
}

function makeInMemorySubscriptionStore() {
  const subs = new Map<string, SubscriptionRecord>();
  return {
    async saveSubscription(sub: SubscriptionRecord): Promise<void> {
      subs.set(sub.id, sub);
    },
  };
}

export type TrialStore = ReturnType<typeof makeInMemoryTrialStore>;
export type OnboardingStore = ReturnType<typeof makeInMemoryOnboardingStore>;
export type SubscriptionStoreImpl = ReturnType<typeof makeInMemorySubscriptionStore>;

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly metricsRegistry: MetricsRegistry;
  readonly auditLogger: ConsoleAuditLogger;
  readonly authenticator: Authenticator;
  readonly referralService: ReferralService;
  readonly creditService: CreditService;
  readonly creditStore: CreditStore;
  readonly couponStore: CouponStore;
  readonly campaignStore: CampaignStore;
  readonly lifecycleStore: LifecycleStore;
  readonly trialStore: TrialStore;
  readonly onboardingStore: OnboardingStore;
  readonly subscriptionStore: SubscriptionStoreImpl;
  readonly flows: {
    readonly startTrial: typeof startTrialFlow;
    readonly convertTrial: typeof convertTrialFlow;
    readonly grantCredits: typeof grantCreditsFlow;
    readonly completeOnboardingStep: typeof completeOnboardingStep;
    readonly skipOnboardingStep: typeof skipOnboardingStep;
    readonly getOnboardingChecklist: typeof getOnboardingChecklist;
  };
}

export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({
    level: config.logLevel as string,
    bindings: { service: "growth-api", env: config.nodeEnv },
  });

  const metricsRegistry = new MetricsRegistry();
  const auditLogger = new ConsoleAuditLogger();

  // Auth
  const apiKeyStore = makeInProcessApiKeyStore();
  const authenticator = new ApiKeyAuthenticator(apiKeyStore, createApiKeyHasher());

  // Referrals
  const referralStore = new InMemoryReferralStore();
  const trackingStore = new InMemoryTrackingStore();
  const tracker = new Tracker(trackingStore);
  const redemptionStore = new InMemoryRedemptionStore();
  const redemptionService = new RedemptionService(redemptionStore);
  const referralService = new ReferralService(referralStore, tracker, redemptionService);

  // Credits
  const creditStore = new InMemoryCreditStore();
  const creditService = new CreditService({ store: creditStore, clock: systemClock });

  // Coupons
  const couponStore = new InMemoryCouponStore();

  // Campaigns
  const campaignStore = new InMemoryCampaignStore();

  // Lifecycle
  const lifecycleStore = createInMemoryLifecycleStore();

  // Trial / Onboarding / Subscription
  const trialStore = makeInMemoryTrialStore();
  const onboardingStore = makeInMemoryOnboardingStore();
  const subscriptionStore = makeInMemorySubscriptionStore();

  logger.info("growth-api container built", { port: config.port, env: config.nodeEnv });

  return Object.freeze({
    config,
    logger,
    metricsRegistry,
    auditLogger,
    authenticator,
    referralService,
    creditService,
    creditStore,
    couponStore,
    campaignStore,
    lifecycleStore,
    trialStore,
    onboardingStore,
    subscriptionStore,
    flows: {
      startTrial: startTrialFlow,
      convertTrial: convertTrialFlow,
      grantCredits: grantCreditsFlow,
      completeOnboardingStep,
      skipOnboardingStep,
      getOnboardingChecklist,
    },
  });
}
