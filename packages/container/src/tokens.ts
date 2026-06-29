// DI tokens — unique symbols identifying each registered service or repository.

/** Unique injection token for a dependency. */
export type Token<_T> = symbol;

function token<T>(name: string): Token<T> {
  return Symbol(name);
}

// ── Config ────────────────────────────────────────────────────────────────────
import type { AppConfig } from "@veritas/config";
export const CONFIG = token<AppConfig>("AppConfig");

// ── Observability ─────────────────────────────────────────────────────────────
import type { Logger } from "@veritas/observability";
import type { MetricsRegistry } from "@veritas/observability";
export const LOGGER = token<Logger>("Logger");
export const METRICS = token<MetricsRegistry>("MetricsRegistry");

// ── Persistence — repositories ────────────────────────────────────────────────
import type {
  ReportRepository,
  JobRepository,
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

export const REPORT_REPO       = token<ReportRepository>("ReportRepository");
export const JOB_REPO          = token<JobRepository>("JobRepository");
export const AGENT_REPO        = token<AgentRepository>("AgentRepository");
export const SERVICE_REPO      = token<ServiceRepository>("ServiceRepository");
export const API_KEY_REPO      = token<ApiKeyRepository>("ApiKeyRepository");
export const ORDER_REPO        = token<OrderRepository>("OrderRepository");
export const NEGOTIATION_REPO  = token<NegotiationRepository>("NegotiationRepository");
export const DELIVERY_REPO     = token<DeliveryRepository>("DeliveryRepository");
export const WALLET_REPO       = token<WalletRepository>("WalletRepository");
export const USAGE_REPO        = token<UsageRepository>("UsageRepository");
export const INVOICE_REPO      = token<InvoiceRepository>("InvoiceRepository");
export const PLAN_REPO         = token<PlanRepository>("PlanRepository");
export const SUBSCRIPTION_REPO = token<SubscriptionRepository>("SubscriptionRepository");
export const WEBHOOK_REPO      = token<WebhookRepository>("WebhookRepository");
export const WEBHOOK_DELIVERY_REPO = token<WebhookDeliveryRepository>("WebhookDeliveryRepository");
export const AUDIT_LOG_REPO    = token<AuditLogRepository>("AuditLogRepository");
export const USER_REPO         = token<UserRepository>("UserRepository");
export const ORGANIZATION_REPO = token<OrganizationRepository>("OrganizationRepository");
export const MEMBERSHIP_REPO   = token<MembershipRepository>("MembershipRepository");
export const SESSION_REPO      = token<SessionRepository>("SessionRepository");
export const SETTLEMENT_REPO   = token<SettlementRepository>("SettlementRepository");
export const TRANSACTION_REPO  = token<TransactionRepository>("TransactionRepository");
export const NOTIFICATION_REPO = token<NotificationRepository>("NotificationRepository");
export const IDEMPOTENCY_REPO  = token<IdempotencyKeyRepository>("IdempotencyKeyRepository");

// ── Services ──────────────────────────────────────────────────────────────────
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

export const VERIFICATION_JOB_SVC   = token<VerificationJobService>("VerificationJobService");
export const REPORT_SVC             = token<ReportService>("ReportService");
export const AGENT_SVC              = token<AgentService>("AgentService");
export const SERVICE_CATALOG_SVC    = token<ServiceCatalogService>("ServiceCatalogService");
export const API_KEY_SVC            = token<ApiKeyService>("ApiKeyService");
export const ORDER_SVC              = token<OrderService>("OrderService");
export const NEGOTIATION_SVC        = token<NegotiationService>("NegotiationService");
export const DELIVERY_SVC           = token<DeliveryService>("DeliveryService");
export const WALLET_SVC             = token<WalletService>("WalletService");
export const USAGE_METERING_SVC     = token<UsageMeteringService>("UsageMeteringService");
export const INVOICE_SVC            = token<InvoiceService>("InvoiceService");
export const PLAN_SVC               = token<PlanService>("PlanService");
export const SUBSCRIPTION_SVC       = token<SubscriptionService>("SubscriptionService");
export const WEBHOOK_SVC            = token<WebhookService>("WebhookService");
export const AUDIT_LOG_SVC          = token<AuditLogService>("AuditLogService");
export const USER_SVC               = token<UserService>("UserService");
export const ORGANIZATION_SVC       = token<OrganizationService>("OrganizationService");
export const MEMBERSHIP_SVC         = token<MembershipService>("MembershipService");
export const SESSION_SVC            = token<SessionService>("SessionService");
export const SETTLEMENT_SVC         = token<SettlementService>("SettlementService");
export const TRANSACTION_SVC        = token<TransactionService>("TransactionService");
export const NOTIFICATION_SVC       = token<NotificationService>("NotificationService");
export const IDEMPOTENCY_SVC        = token<IdempotencyService>("IdempotencyService");
export const RATE_LIMIT_SVC         = token<RateLimitService>("RateLimitService");
export const AGENT_REGISTRATION_SVC = token<AgentRegistrationService>("AgentRegistrationService");
export const PRICING_SVC            = token<PricingService>("PricingService");
export const QUOTA_SVC              = token<QuotaService>("QuotaService");

// ── Verification engine ────────────────────────────────────────────────────────
import type { VerifierLLM, ProviderRegistry } from "@veritas/llm";
import type {
  EngineOptions,
  InputGuard,
  ConfidenceCalibrator,
  CitationRefiner,
  DomainVerifierRouter,
} from "@veritas/verification";
import type { CapProviderConfig } from "@veritas/cap";
export const LLM_PROVIDER         = token<VerifierLLM>("VerifierLLM");
export const LLM_REGISTRY         = token<ProviderRegistry>("ProviderRegistry");
export const ENGINE_OPTIONS       = token<EngineOptions>("EngineOptions");
export const VERIFICATION_CONFIG  = token<Record<string, unknown>>("VerificationConfig");
export const INPUT_GUARD            = token<InputGuard>("InputGuard");
export const CONFIDENCE_CALIBRATOR  = token<ConfidenceCalibrator>("ConfidenceCalibrator");
export const CITATION_REFINER       = token<CitationRefiner>("CitationRefiner");
export const DOMAIN_VERIFIER_ROUTER = token<DomainVerifierRouter>("DomainVerifierRouter");
import type { EvidenceGraphService } from "./modules/fact-graph.module.js";
export const EVIDENCE_GRAPH_SVC     = token<EvidenceGraphService>("EvidenceGraphService");
export const CAP_PROVIDER         = token<unknown>("CapProvider");
export const CAP_CONFIG           = token<CapProviderConfig>("CapConfig");

// ── TOKENS namespace (convenience object mirroring individual exports) ─────────
export const TOKENS = {
  // Config
  Config:             CONFIG,
  // Observability
  Logger:             LOGGER,
  Metrics:            METRICS,
  // Repos
  ReportRepo:         REPORT_REPO,
  JobRepo:            JOB_REPO,
  AgentRepo:          AGENT_REPO,
  ServiceRepo:        SERVICE_REPO,
  ApiKeyRepo:         API_KEY_REPO,
  OrderRepo:          ORDER_REPO,
  NegotiationRepo:    NEGOTIATION_REPO,
  DeliveryRepo:       DELIVERY_REPO,
  WalletRepo:         WALLET_REPO,
  UsageRepo:          USAGE_REPO,
  InvoiceRepo:        INVOICE_REPO,
  PlanRepo:           PLAN_REPO,
  SubscriptionRepo:   SUBSCRIPTION_REPO,
  WebhookRepo:        WEBHOOK_REPO,
  WebhookDeliveryRepo: WEBHOOK_DELIVERY_REPO,
  AuditLogRepo:       AUDIT_LOG_REPO,
  UserRepo:           USER_REPO,
  OrganizationRepo:   ORGANIZATION_REPO,
  MembershipRepo:     MEMBERSHIP_REPO,
  SessionRepo:        SESSION_REPO,
  SettlementRepo:     SETTLEMENT_REPO,
  TransactionRepo:    TRANSACTION_REPO,
  NotificationRepo:   NOTIFICATION_REPO,
  IdempotencyRepo:    IDEMPOTENCY_REPO,
  // Services
  VerificationJobSvc:   VERIFICATION_JOB_SVC,
  ReportSvc:            REPORT_SVC,
  AgentSvc:             AGENT_SVC,
  ServiceCatalogSvc:    SERVICE_CATALOG_SVC,
  ApiKeySvc:            API_KEY_SVC,
  OrderSvc:             ORDER_SVC,
  NegotiationSvc:       NEGOTIATION_SVC,
  DeliverySvc:          DELIVERY_SVC,
  WalletSvc:            WALLET_SVC,
  UsageMeteringSvc:     USAGE_METERING_SVC,
  InvoiceSvc:           INVOICE_SVC,
  PlanSvc:              PLAN_SVC,
  SubscriptionSvc:      SUBSCRIPTION_SVC,
  WebhookSvc:           WEBHOOK_SVC,
  AuditLogSvc:          AUDIT_LOG_SVC,
  UserSvc:              USER_SVC,
  OrganizationSvc:      ORGANIZATION_SVC,
  MembershipSvc:        MEMBERSHIP_SVC,
  SessionSvc:           SESSION_SVC,
  SettlementSvc:        SETTLEMENT_SVC,
  TransactionSvc:       TRANSACTION_SVC,
  NotificationSvc:      NOTIFICATION_SVC,
  IdempotencySvc:       IDEMPOTENCY_SVC,
  RateLimitSvc:         RATE_LIMIT_SVC,
  AgentRegistrationSvc: AGENT_REGISTRATION_SVC,
  PricingSvc:           PRICING_SVC,
  QuotaSvc:             QUOTA_SVC,
  // Verification engine
  LlmProvider:          LLM_PROVIDER,
  LlmRegistry:          LLM_REGISTRY,
  EngineOptions:        ENGINE_OPTIONS,
  VerificationConfig:   VERIFICATION_CONFIG,
  InputGuard:           INPUT_GUARD,
  ConfidenceCalibrator: CONFIDENCE_CALIBRATOR,
  CitationRefiner:      CITATION_REFINER,
  DomainVerifierRouter: DOMAIN_VERIFIER_ROUTER,
  EvidenceGraphSvc:     EVIDENCE_GRAPH_SVC,
  // CAP
  CapProvider:          CAP_PROVIDER,
  CapConfig:            CAP_CONFIG,
} as const;
