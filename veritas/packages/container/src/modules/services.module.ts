// Services module: wires all application-service singletons using resolved repos.

import { systemClock } from "@veritas/core";
import type { RegistrationMetaStore } from "@veritas/services/agent-registration/agent-registration.service.js";
import type { RegistrationStatus } from "@veritas/services/agent-registration/agent-registration.dto.js";
import { InMemoryRateLimitStore } from "@veritas/services/rate-limit/rate-limit.service.js";
import {
  VerificationJobService,
  ReportService,
  AgentService,
  ServiceCatalogService,
  ApiKeyService,
  OrderService,
  NegotiationService,
  DeliveryService,
  WalletService,
  UsageMeteringService,
  InvoiceService,
  PlanService,
  SubscriptionService,
  WebhookService,
  AuditLogService,
  UserService,
  OrganizationService,
  MembershipService,
  SessionService,
  SettlementService,
  TransactionService,
  NotificationService,
  IdempotencyService,
  RateLimitService,
  AgentRegistrationService,
  PricingService,
  QuotaService,
} from "@veritas/services";
import type { Container } from "../container.js";
import {
  LOGGER,
  REPORT_REPO,
  JOB_REPO,
  AGENT_REPO,
  SERVICE_REPO,
  API_KEY_REPO,
  ORDER_REPO,
  NEGOTIATION_REPO,
  DELIVERY_REPO,
  WALLET_REPO,
  USAGE_REPO,
  INVOICE_REPO,
  PLAN_REPO,
  SUBSCRIPTION_REPO,
  SETTLEMENT_REPO,
  TRANSACTION_REPO,
  NOTIFICATION_REPO,
  IDEMPOTENCY_REPO,
  VERIFICATION_JOB_SVC,
  REPORT_SVC,
  AGENT_SVC,
  SERVICE_CATALOG_SVC,
  API_KEY_SVC,
  ORDER_SVC,
  NEGOTIATION_SVC,
  DELIVERY_SVC,
  WALLET_SVC,
  USAGE_METERING_SVC,
  INVOICE_SVC,
  PLAN_SVC,
  SUBSCRIPTION_SVC,
  WEBHOOK_SVC,
  AUDIT_LOG_SVC,
  USER_REPO,
  USER_SVC,
  ORGANIZATION_REPO,
  ORGANIZATION_SVC,
  MEMBERSHIP_REPO,
  MEMBERSHIP_SVC,
  SESSION_REPO,
  SESSION_SVC,
  SETTLEMENT_SVC,
  TRANSACTION_SVC,
  NOTIFICATION_SVC,
  IDEMPOTENCY_SVC,
  RATE_LIMIT_SVC,
  AGENT_REGISTRATION_SVC,
  PRICING_SVC,
  QUOTA_SVC,
  ENGINE_OPTIONS,
} from "../tokens.js";

/** Local mirror of the private RegistrationMeta shape from agent-registration.service.ts. */
interface RegistrationMeta {
  readonly agentId: string;
  readonly orgId: string;
  status: RegistrationStatus;
  reason: string | null;
  approverNotes: string | null;
  readonly registeredAt: string;
  statusChangedAt: string;
}

/** In-memory no-op registration store used when no persistent store is wired. */
class InMemoryRegistrationMetaStore implements RegistrationMetaStore {
  private readonly map = new Map<string, RegistrationMeta>();

  async get(agentId: string): Promise<RegistrationMeta | undefined> {
    return this.map.get(agentId);
  }

  async set(meta: RegistrationMeta): Promise<void> {
    this.map.set(meta.agentId, meta);
  }

  async list(
    filters: { orgId?: string; status?: RegistrationStatus },
    _cursor?: string,
    _limit?: number,
  ): Promise<{ items: RegistrationMeta[]; nextCursor: string | null; total: number }> {
    const all = [...this.map.values()];
    const items = all.filter((m) => {
      if (filters.orgId !== undefined && m.orgId !== filters.orgId) return false;
      if (filters.status !== undefined && m.status !== filters.status) return false;
      return true;
    });
    return { items, nextCursor: null, total: items.length };
  }
}

/** Register all application-service singletons onto the container. */
export function registerServices(c: Container): void {
  const clock = systemClock;

  c.singleton(VERIFICATION_JOB_SVC, (ctr) =>
    new VerificationJobService({
      jobRepository: ctr.resolve(JOB_REPO),
      logger: ctr.resolve(LOGGER),
      engineOptions: ctr.resolve(ENGINE_OPTIONS),
    }),
  );

  c.singleton(REPORT_SVC, (ctr) =>
    new ReportService({
      reportRepository: ctr.resolve(REPORT_REPO),
      logger: ctr.resolve(LOGGER),
    }),
  );

  c.singleton(AGENT_SVC, (ctr) =>
    new AgentService({
      agentRepository: ctr.resolve(AGENT_REPO),
      logger: ctr.resolve(LOGGER),
    }),
  );

  c.singleton(SERVICE_CATALOG_SVC, (ctr) =>
    new ServiceCatalogService({
      serviceRepo: ctr.resolve(SERVICE_REPO),
      logger: ctr.resolve(LOGGER),
    }),
  );

  c.singleton(API_KEY_SVC, (ctr) =>
    new ApiKeyService({
      apiKeyRepo: ctr.resolve(API_KEY_REPO),
      logger: ctr.resolve(LOGGER),
    }),
  );

  c.singleton(ORDER_SVC, (ctr) =>
    new OrderService(ctr.resolve(ORDER_REPO), ctr.resolve(LOGGER)),
  );

  c.singleton(NEGOTIATION_SVC, (ctr) =>
    new NegotiationService(ctr.resolve(NEGOTIATION_REPO), ctr.resolve(LOGGER)),
  );

  c.singleton(DELIVERY_SVC, (ctr) =>
    new DeliveryService(ctr.resolve(DELIVERY_REPO), ctr.resolve(LOGGER)),
  );

  c.singleton(WALLET_SVC, (ctr) =>
    new WalletService({
      walletRepository: ctr.resolve(WALLET_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(USAGE_METERING_SVC, (ctr) =>
    new UsageMeteringService({
      usageRepository: ctr.resolve(USAGE_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(INVOICE_SVC, (ctr) =>
    new InvoiceService({
      invoiceRepo: ctr.resolve(INVOICE_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(PLAN_SVC, (ctr) =>
    new PlanService({
      planRepo: ctr.resolve(PLAN_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(SUBSCRIPTION_SVC, (ctr) =>
    new SubscriptionService({
      subscriptionRepo: ctr.resolve(SUBSCRIPTION_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(WEBHOOK_SVC, (ctr) =>
    new WebhookService({
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(AUDIT_LOG_SVC, (ctr) =>
    new AuditLogService({
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(USER_SVC, (ctr) =>
    new UserService({
      userRepo: ctr.resolve(USER_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(ORGANIZATION_SVC, (ctr) =>
    new OrganizationService({
      orgRepo: ctr.resolve(ORGANIZATION_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(MEMBERSHIP_SVC, (ctr) =>
    new MembershipService({
      membershipRepo: ctr.resolve(MEMBERSHIP_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(SESSION_SVC, (ctr) =>
    new SessionService({
      sessionRepo: ctr.resolve(SESSION_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(SETTLEMENT_SVC, (ctr) =>
    new SettlementService({
      settlementRepo: ctr.resolve(SETTLEMENT_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(TRANSACTION_SVC, (ctr) =>
    new TransactionService({
      transactionRepository: ctr.resolve(TRANSACTION_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(NOTIFICATION_SVC, (ctr) =>
    new NotificationService({
      notificationRepository: ctr.resolve(NOTIFICATION_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(IDEMPOTENCY_SVC, (ctr) =>
    new IdempotencyService({
      idempotencyKeyRepository: ctr.resolve(IDEMPOTENCY_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(RATE_LIMIT_SVC, (ctr) =>
    new RateLimitService({
      store: new InMemoryRateLimitStore(),
      logger: ctr.tryResolve(LOGGER),
      clock,
    }),
  );

  c.singleton(AGENT_REGISTRATION_SVC, (ctr) =>
    new AgentRegistrationService({
      agentRepository: ctr.resolve(AGENT_REPO),
      registrationStore: new InMemoryRegistrationMetaStore(),
      logger: ctr.tryResolve(LOGGER),
      clock,
    }),
  );

  c.singleton(PRICING_SVC, (ctr) =>
    new PricingService({
      planRepo: ctr.resolve(PLAN_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );

  c.singleton(QUOTA_SVC, (ctr) =>
    new QuotaService({
      usageRepo: ctr.resolve(USAGE_REPO),
      subscriptionRepo: ctr.resolve(SUBSCRIPTION_REPO),
      logger: ctr.resolve(LOGGER),
      clock,
    }),
  );
}
