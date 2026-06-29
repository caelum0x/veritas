// @veritas/persistence: re-exports the full persistence public surface.

// Foundation
export * from "./errors.js";
export * from "./base-repository.js";
export * from "./query.js";
export * from "./pagination.js";
export * from "./unit-of-work.js";
export * from "./repository-registry.js";

// In-memory store primitive
export * from "./memory/memory-store.js";

// Report
export * from "./repositories/report.repository.js";
export * from "./memory/report.memory-repository.js";
export * as ReportMapper from "./mappers/report.mapper.js";

// Job
export * from "./repositories/job.repository.js";
export * from "./memory/job.memory-repository.js";
export * as JobMapper from "./mappers/job.mapper.js";

// Negotiation
export * from "./repositories/negotiation.repository.js";
export * from "./memory/negotiation.memory-repository.js";
export * from "./mappers/negotiation.mapper.js";

// Order
export * from "./repositories/order.repository.js";
export * from "./memory/order.memory-repository.js";
export * from "./mappers/order.mapper.js";

// Delivery
export * from "./repositories/delivery.repository.js";
export * from "./memory/delivery.memory-repository.js";
export * from "./mappers/delivery.mapper.js";

// Agent
export * from "./repositories/agent.repository.js";
export * from "./memory/agent.memory-repository.js";
export * from "./mappers/agent.mapper.js";

// Service
export * from "./repositories/service.repository.js";
export * from "./memory/service.memory-repository.js";
export * from "./mappers/service.mapper.js";

// ApiKey — memory repo redefines ApiKeyRepository; export the canonical one from the repo file only
export * from "./repositories/apiKey.repository.js";
export { ApiKeyMemoryRepository, ApiKeyFilters } from "./memory/apiKey.memory-repository.js";
export * as ApiKeyMapper from "./mappers/apiKey.mapper.js";

// Wallet
export * from "./repositories/wallet.repository.js";
export * from "./memory/wallet.memory-repository.js";
export * as WalletMapper from "./mappers/wallet.mapper.js";

// Usage
export * from "./repositories/usage.repository.js";
export * from "./memory/usage.memory-repository.js";
export * as UsageMapper from "./mappers/usage.mapper.js";

// Invoice
export * from "./repositories/invoice.repository.js";
export * from "./memory/invoice.memory-repository.js";
export * from "./mappers/invoice.mapper.js";

// Plan — plan.mapper also exports nowEpoch which conflicts with invoice.mapper
export * from "./repositories/plan.repository.js";
export * from "./memory/plan.memory-repository.js";
export * as PlanMapper from "./mappers/plan.mapper.js";

// Subscription
export * from "./repositories/subscription.repository.js";
export * from "./memory/subscription.memory-repository.js";
export * as SubscriptionMapper from "./mappers/subscription.mapper.js";

// Webhook
export * from "./repositories/webhook.repository.js";
export * from "./memory/webhook.memory-repository.js";
export * as WebhookMapper from "./mappers/webhook.mapper.js";

// WebhookDelivery
export * from "./repositories/webhookDelivery.repository.js";
export * from "./memory/webhookDelivery.memory-repository.js";
export * as WebhookDeliveryMapper from "./mappers/webhookDelivery.mapper.js";

// AuditLog
export * from "./repositories/auditLog.repository.js";
export * from "./memory/auditLog.memory-repository.js";
export * as AuditLogMapper from "./mappers/auditLog.mapper.js";

// User
export * from "./repositories/user.repository.js";
export * from "./memory/user.memory-repository.js";
export * as UserMapper from "./mappers/user.mapper.js";

// Organization — memory repo redefines OrganizationFilters; export canonical from repo file only
export * from "./repositories/organization.repository.js";
export { OrganizationMemoryRepository } from "./memory/organization.memory-repository.js";
export * as OrganizationMapper from "./mappers/organization.mapper.js";

// Membership
export * from "./repositories/membership.repository.js";
export * from "./memory/membership.memory-repository.js";
export * as MembershipMapper from "./mappers/membership.mapper.js";

// Session
export * from "./repositories/session.repository.js";
export * from "./memory/session.memory-repository.js";
export * from "./mappers/session.mapper.js";

// Settlement
export * from "./repositories/settlement.repository.js";
export * from "./memory/settlement.memory-repository.js";
export * from "./mappers/settlement.mapper.js";

// Transaction
export * from "./repositories/transaction.repository.js";
export * from "./memory/transaction.memory-repository.js";
export * from "./mappers/transaction.mapper.js";

// Notification
export * from "./repositories/notification.repository.js";
export * from "./memory/notification.memory-repository.js";
export * as NotificationMapper from "./mappers/notification.mapper.js";

// IdempotencyKey
export * from "./repositories/idempotencyKey.repository.js";
export * from "./memory/idempotencyKey.memory-repository.js";
export * as IdempotencyKeyMapper from "./mappers/idempotencyKey.mapper.js";
