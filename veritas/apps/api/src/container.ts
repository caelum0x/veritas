// Builds the Deps object by wiring all package services/repos/flows via @veritas/container.
import {
  buildContainer as buildPackageContainer,
  Container,
  TOKENS,
} from "@veritas/container";
import type { AppConfig } from "@veritas/config";
import type { Logger } from "@veritas/observability";
import type { MetricsRegistry } from "@veritas/observability";
import type {
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
import type {
  JobRepository,
  ReportRepository,
  AgentRepository,
  ServiceRepository,
  ApiKeyRepository,
  OrderRepository,
  NegotiationRepository,
  DeliveryRepository,
  WalletRepository,
  UsageRepository,
  InvoiceRepository,
  PlanRepository,
  SubscriptionRepository,
  WebhookRepository,
  WebhookDeliveryRepository,
  AuditLogRepository,
  UserRepository,
  OrganizationRepository,
  MembershipRepository,
  SessionRepository,
  SettlementRepository,
  TransactionRepository,
  NotificationRepository,
  IdempotencyKeyRepository,
} from "@veritas/persistence";

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly metrics: MetricsRegistry;
  // Repositories
  readonly jobRepo: JobRepository;
  readonly reportRepo: ReportRepository;
  readonly agentRepo: AgentRepository;
  readonly serviceRepo: ServiceRepository;
  readonly apiKeyRepo: ApiKeyRepository;
  readonly orderRepo: OrderRepository;
  readonly negotiationRepo: NegotiationRepository;
  readonly deliveryRepo: DeliveryRepository;
  readonly walletRepo: WalletRepository;
  readonly usageRepo: UsageRepository;
  readonly invoiceRepo: InvoiceRepository;
  readonly planRepo: PlanRepository;
  readonly subscriptionRepo: SubscriptionRepository;
  readonly webhookRepo: WebhookRepository;
  readonly webhookDeliveryRepo: WebhookDeliveryRepository;
  readonly auditLogRepo: AuditLogRepository;
  readonly userRepo: UserRepository;
  readonly orgRepo: OrganizationRepository;
  readonly membershipRepo: MembershipRepository;
  readonly sessionRepo: SessionRepository;
  readonly settlementRepo: SettlementRepository;
  readonly transactionRepo: TransactionRepository;
  readonly notificationRepo: NotificationRepository;
  readonly idempotencyRepo: IdempotencyKeyRepository;
  // Services
  readonly verificationJobSvc: VerificationJobService;
  readonly reportSvc: ReportService;
  readonly agentSvc: AgentService;
  readonly serviceCatalogSvc: ServiceCatalogService;
  readonly apiKeySvc: ApiKeyService;
  readonly orderSvc: OrderService;
  readonly negotiationSvc: NegotiationService;
  readonly deliverySvc: DeliveryService;
  readonly walletSvc: WalletService;
  readonly usageMeteringSvc: UsageMeteringService;
  readonly invoiceSvc: InvoiceService;
  readonly planSvc: PlanService;
  readonly subscriptionSvc: SubscriptionService;
  readonly webhookSvc: WebhookService;
  readonly auditLogSvc: AuditLogService;
  readonly userSvc: UserService;
  readonly orgSvc: OrganizationService;
  readonly membershipSvc: MembershipService;
  readonly sessionSvc: SessionService;
  readonly settlementSvc: SettlementService;
  readonly transactionSvc: TransactionService;
  readonly notificationSvc: NotificationService;
  readonly idempotencySvc: IdempotencyService;
  readonly rateLimitSvc: RateLimitService;
  readonly agentRegistrationSvc: AgentRegistrationService;
  readonly pricingSvc: PricingService;
  readonly quotaSvc: QuotaService;
  // Raw container for advanced consumers
  readonly container: Container;
}

export function buildDeps(config: AppConfig): Deps {
  const c = buildPackageContainer({ config });

  return {
    config,
    logger:               c.resolve(TOKENS.Logger),
    metrics:              c.resolve(TOKENS.Metrics),
    // Repositories
    jobRepo:              c.resolve(TOKENS.JobRepo),
    reportRepo:           c.resolve(TOKENS.ReportRepo),
    agentRepo:            c.resolve(TOKENS.AgentRepo),
    serviceRepo:          c.resolve(TOKENS.ServiceRepo),
    apiKeyRepo:           c.resolve(TOKENS.ApiKeyRepo),
    orderRepo:            c.resolve(TOKENS.OrderRepo),
    negotiationRepo:      c.resolve(TOKENS.NegotiationRepo),
    deliveryRepo:         c.resolve(TOKENS.DeliveryRepo),
    walletRepo:           c.resolve(TOKENS.WalletRepo),
    usageRepo:            c.resolve(TOKENS.UsageRepo),
    invoiceRepo:          c.resolve(TOKENS.InvoiceRepo),
    planRepo:             c.resolve(TOKENS.PlanRepo),
    subscriptionRepo:     c.resolve(TOKENS.SubscriptionRepo),
    webhookRepo:          c.resolve(TOKENS.WebhookRepo),
    webhookDeliveryRepo:  c.resolve(TOKENS.WebhookDeliveryRepo),
    auditLogRepo:         c.resolve(TOKENS.AuditLogRepo),
    userRepo:             c.resolve(TOKENS.UserRepo),
    orgRepo:              c.resolve(TOKENS.OrganizationRepo),
    membershipRepo:       c.resolve(TOKENS.MembershipRepo),
    sessionRepo:          c.resolve(TOKENS.SessionRepo),
    settlementRepo:       c.resolve(TOKENS.SettlementRepo),
    transactionRepo:      c.resolve(TOKENS.TransactionRepo),
    notificationRepo:     c.resolve(TOKENS.NotificationRepo),
    idempotencyRepo:      c.resolve(TOKENS.IdempotencyRepo),
    // Services
    verificationJobSvc:   c.resolve(TOKENS.VerificationJobSvc),
    reportSvc:            c.resolve(TOKENS.ReportSvc),
    agentSvc:             c.resolve(TOKENS.AgentSvc),
    serviceCatalogSvc:    c.resolve(TOKENS.ServiceCatalogSvc),
    apiKeySvc:            c.resolve(TOKENS.ApiKeySvc),
    orderSvc:             c.resolve(TOKENS.OrderSvc),
    negotiationSvc:       c.resolve(TOKENS.NegotiationSvc),
    deliverySvc:          c.resolve(TOKENS.DeliverySvc),
    walletSvc:            c.resolve(TOKENS.WalletSvc),
    usageMeteringSvc:     c.resolve(TOKENS.UsageMeteringSvc),
    invoiceSvc:           c.resolve(TOKENS.InvoiceSvc),
    planSvc:              c.resolve(TOKENS.PlanSvc),
    subscriptionSvc:      c.resolve(TOKENS.SubscriptionSvc),
    webhookSvc:           c.resolve(TOKENS.WebhookSvc),
    auditLogSvc:          c.resolve(TOKENS.AuditLogSvc),
    userSvc:              c.resolve(TOKENS.UserSvc),
    orgSvc:               c.resolve(TOKENS.OrganizationSvc),
    membershipSvc:        c.resolve(TOKENS.MembershipSvc),
    sessionSvc:           c.resolve(TOKENS.SessionSvc),
    settlementSvc:        c.resolve(TOKENS.SettlementSvc),
    transactionSvc:       c.resolve(TOKENS.TransactionSvc),
    notificationSvc:      c.resolve(TOKENS.NotificationSvc),
    idempotencySvc:       c.resolve(TOKENS.IdempotencySvc),
    rateLimitSvc:         c.resolve(TOKENS.RateLimitSvc),
    agentRegistrationSvc: c.resolve(TOKENS.AgentRegistrationSvc),
    pricingSvc:           c.resolve(TOKENS.PricingSvc),
    quotaSvc:             c.resolve(TOKENS.QuotaSvc),
    container:            c,
  };
}
