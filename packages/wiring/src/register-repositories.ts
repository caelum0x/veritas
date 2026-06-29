// Register all in-memory repository implementations onto the DI container.

import {
  ReportMemoryRepository,
  JobMemoryRepository,
  MemoryAgentRepository,
  InMemoryServiceRepository,
  ApiKeyMemoryRepository,
  OrderMemoryRepository,
  NegotiationMemoryRepository,
  MemoryDeliveryRepository,
  WalletMemoryRepository,
  UsageMemoryRepository,
  InvoiceMemoryRepository,
  MemoryPlanRepository,
  SubscriptionMemoryRepository,
  WebhookMemoryRepository,
  WebhookDeliveryMemoryRepository,
  AuditLogMemoryRepository,
  UserMemoryRepository,
  OrganizationMemoryRepository,
  MembershipMemoryRepository,
  SessionMemoryRepository,
  SettlementMemoryRepository,
  TransactionMemoryRepository,
  NotificationMemoryRepository,
  IdempotencyKeyMemoryRepository,
} from "@veritas/persistence";
import {
  Container,
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
  WEBHOOK_REPO,
  WEBHOOK_DELIVERY_REPO,
  AUDIT_LOG_REPO,
  USER_REPO,
  ORGANIZATION_REPO,
  MEMBERSHIP_REPO,
  SESSION_REPO,
  SETTLEMENT_REPO,
  TRANSACTION_REPO,
  NOTIFICATION_REPO,
  IDEMPOTENCY_REPO,
} from "@veritas/container";

/** Bind all repository singletons using in-memory implementations. */
export function registerRepositories(c: Container): void {
  c.singleton(REPORT_REPO,            () => new ReportMemoryRepository());
  c.singleton(JOB_REPO,               () => new JobMemoryRepository());
  c.singleton(AGENT_REPO,             () => new MemoryAgentRepository());
  c.singleton(SERVICE_REPO,           () => new InMemoryServiceRepository());
  c.singleton(API_KEY_REPO,           () => new ApiKeyMemoryRepository());
  c.singleton(ORDER_REPO,             () => new OrderMemoryRepository());
  c.singleton(NEGOTIATION_REPO,       () => new NegotiationMemoryRepository());
  c.singleton(DELIVERY_REPO,          () => new MemoryDeliveryRepository());
  c.singleton(WALLET_REPO,            () => new WalletMemoryRepository());
  c.singleton(USAGE_REPO,             () => new UsageMemoryRepository());
  c.singleton(INVOICE_REPO,           () => new InvoiceMemoryRepository());
  c.singleton(PLAN_REPO,              () => new MemoryPlanRepository());
  c.singleton(SUBSCRIPTION_REPO,      () => new SubscriptionMemoryRepository());
  c.singleton(WEBHOOK_REPO,           () => new WebhookMemoryRepository());
  c.singleton(WEBHOOK_DELIVERY_REPO,  () => new WebhookDeliveryMemoryRepository());
  c.singleton(AUDIT_LOG_REPO,         () => new AuditLogMemoryRepository());
  c.singleton(USER_REPO,              () => new UserMemoryRepository());
  c.singleton(ORGANIZATION_REPO,      () => new OrganizationMemoryRepository());
  c.singleton(MEMBERSHIP_REPO,        () => new MembershipMemoryRepository());
  c.singleton(SESSION_REPO,           () => new SessionMemoryRepository());
  c.singleton(SETTLEMENT_REPO,        () => new SettlementMemoryRepository());
  c.singleton(TRANSACTION_REPO,       () => new TransactionMemoryRepository());
  c.singleton(NOTIFICATION_REPO,      () => new NotificationMemoryRepository());
  c.singleton(IDEMPOTENCY_REPO,       () => new IdempotencyKeyMemoryRepository());
}
