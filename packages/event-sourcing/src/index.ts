// Public surface of the @veritas/event-sourcing package.

// Core event types
export type { DomainEventMetadata, StoredEvent, DomainEventClass } from "./domain-event.js";
export { BaseDomainEvent, makeStoredEvent } from "./domain-event.js";

// Aggregate base
export { AggregateRoot } from "./aggregate-root.js";

// Event store interface
export type { AppendOptions, ReadOptions, EventStore } from "./event-store.js";

// In-memory event store
export { MemoryEventStore } from "./memory-event-store.js";

// Event stream
export type { EventStream, EventStreamSlice } from "./event-stream.js";
export { makeEventStream, makeEventStreamSlice } from "./event-stream.js";

// Snapshot
export type { Snapshot, SnapshotStore, SnapshotPolicy } from "./snapshot.js";
export {
  EveryNEventsPolicy,
  NeverSnapshotPolicy,
  InMemorySnapshotStore,
  makeSnapshot,
} from "./snapshot.js";

// Projection
export type { ProjectionPosition, Projection, ProjectionStore } from "./projection.js";
export { INITIAL_POSITION, InMemoryProjectionStore } from "./projection.js";

// Projection engine
export type { ProjectionEngineOptions } from "./projection-engine.js";
export { ProjectionEngine } from "./projection-engine.js";

// Event bus
export type { EventHandler, Unsubscribe, EventBus, EventBusOptions } from "./event-bus.js";
export { InProcessEventBus } from "./event-bus.js";

// Repository
export type { RepositoryOptions } from "./repository.js";
export { EventSourcedRepository } from "./repository.js";

// Serializer
export type { SerializedEvent, EventSerializer } from "./serializer.js";
export { createEventSerializer, defaultSerializer } from "./serializer.js";

// Versioning / upcasting
export type { Upcaster, UpcasterEntry, EventVersionRegistry } from "./versioning.js";
export {
  createEventVersionRegistry,
  globalVersionRegistry,
  registerUpcaster,
} from "./versioning.js";

// Errors
export {
  ConcurrencyError,
  AggregateNotFoundError,
  StreamNotFoundError,
  EventDeserializationError,
  UnknownEventTypeError,
  InvalidVersionError,
} from "./errors.js";

// VerificationJob aggregate
export type { VerificationJobState } from "./aggregates/verification-job.aggregate.js";
export { VerificationJobAggregate } from "./aggregates/verification-job.aggregate.js";
export type {
  VerificationJobEventType,
  VjCreatedPayload,
  VjStartedPayload,
  VjAttemptRecordedPayload,
  VjCompletedPayload,
  VjFailedPayload,
  VjCancelledPayload,
  VerificationJobEventPayload,
} from "./aggregates/verification-job.events.js";
export {
  VJ_CREATED,
  VJ_STARTED,
  VJ_ATTEMPT_RECORDED,
  VJ_COMPLETED,
  VJ_FAILED,
  VJ_CANCELLED,
} from "./aggregates/verification-job.events.js";

// Order aggregate
export { OrderAggregate } from "./aggregates/order.aggregate.js";
export type {
  OrderEventType,
  OrderPlacedPayload,
  OrderAcceptedPayload,
  OrderJobLinkedPayload,
  OrderSettlementLinkedPayload,
  OrderCompletedPayload,
  OrderCancelledPayload,
  OrderRefundedPayload,
  OrderEventPayload,
} from "./aggregates/order.events.js";
export {
  ORDER_PLACED,
  ORDER_ACCEPTED,
  ORDER_JOB_LINKED,
  ORDER_SETTLEMENT_LINKED,
  ORDER_COMPLETED,
  ORDER_CANCELLED,
  ORDER_REFUNDED,
} from "./aggregates/order.events.js";

// Invoice aggregate
export { InvoiceAggregate } from "./aggregates/invoice.aggregate.js";
export {
  INVOICE_CREATED,
  INVOICE_FINALIZED,
  INVOICE_PAID,
  INVOICE_VOIDED,
  INVOICE_OVERDUE,
  INVOICE_LINE_ITEM_ADDED,
} from "./aggregates/invoice.events.js";
export type {
  InvoiceEventType,
  InvoiceCreatedPayload,
  InvoiceFinalizedPayload,
  InvoicePaidPayload,
  InvoiceVoidedPayload,
  InvoiceOverduePayload,
  InvoiceLineItemAddedPayload,
  InvoiceLineItemPayload,
  InvoiceEventPayload,
  InvoiceState,
} from "./aggregates/invoice.events.js";

// Agent aggregate
export { AgentAggregate } from "./aggregates/agent.aggregate.js";
export {
  AGENT_REGISTERED,
  AGENT_ENDPOINT_UPDATED,
  AGENT_PUBLIC_KEY_UPDATED,
  AGENT_TRUSTED,
  AGENT_UNTRUSTED,
  AGENT_METADATA_UPDATED,
  AGENT_DEACTIVATED,
} from "./aggregates/agent.events.js";
export type {
  AgentEventType,
  AgentRegisteredPayload,
  AgentEndpointUpdatedPayload,
  AgentPublicKeyUpdatedPayload,
  AgentTrustedPayload,
  AgentUntrustedPayload,
  AgentMetadataUpdatedPayload,
  AgentDeactivatedPayload,
  AgentEventPayload,
} from "./aggregates/agent.events.js";

// Wallet aggregate
export { WalletAggregate } from "./aggregates/wallet.aggregate.js";
export * from "./aggregates/wallet.events.js";

// Webhook aggregate
export { WebhookAggregate } from "./aggregates/webhook.aggregate.js";
export * from "./aggregates/webhook.events.js";

// Organization aggregate
export { OrganizationAggregate } from "./aggregates/organization.aggregate.js";
export * from "./aggregates/organization.events.js";

// Session aggregate
export { SessionAggregate } from "./aggregates/session.aggregate.js";
export * from "./aggregates/session.events.js";

// Settlement aggregate
export { SettlementAggregate } from "./aggregates/settlement.aggregate.js";
export * from "./aggregates/settlement.events.js";

// Subscription aggregate
export { SubscriptionAggregate } from "./aggregates/subscription.aggregate.js";
export {
  SUBSCRIPTION_CREATED,
  SUBSCRIPTION_ACTIVATED,
  SUBSCRIPTION_RENEWED,
  SUBSCRIPTION_CANCELLED,
  SUBSCRIPTION_EXPIRED,
  SUBSCRIPTION_PLAN_CHANGED,
  SUBSCRIPTION_PAST_DUE,
  SUBSCRIPTION_REACTIVATED,
} from "./aggregates/subscription.events.js";
export type {
  SubscriptionEventType,
  SubscriptionCreatedPayload,
  SubscriptionActivatedPayload,
  SubscriptionRenewedPayload,
  SubscriptionCancelledPayload,
  SubscriptionExpiredPayload,
  SubscriptionPlanChangedPayload,
  SubscriptionPastDuePayload,
  SubscriptionReactivatedPayload,
  SubscriptionEventPayload,
  SubscriptionState,
} from "./aggregates/subscription.events.js";
