// Public entry point for @veritas/container: re-exports container, tokens, types, and modules.

export { Container } from "./container.js";
export { buildContainer } from "./build-container.js";
export {
  TOKENS,
  CONFIG,
  LOGGER,
  METRICS,
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
  USER_SVC,
  ORGANIZATION_SVC,
  MEMBERSHIP_SVC,
  SESSION_SVC,
  SETTLEMENT_SVC,
  TRANSACTION_SVC,
  NOTIFICATION_SVC,
  IDEMPOTENCY_SVC,
  RATE_LIMIT_SVC,
  AGENT_REGISTRATION_SVC,
  PRICING_SVC,
  QUOTA_SVC,
  LLM_PROVIDER,
  LLM_REGISTRY,
  ENGINE_OPTIONS,
  VERIFICATION_CONFIG,
  INPUT_GUARD,
  CONFIDENCE_CALIBRATOR,
  CITATION_REFINER,
  DOMAIN_VERIFIER_ROUTER,
  EVIDENCE_GRAPH_SVC,
  CAP_PROVIDER,
  CAP_CONFIG,
} from "./tokens.js";

export type {
  Token,
  Factory,
  AsyncFactory,
  Resolver,
  AsyncResolver,
  Lifecycle,
  Registration,
  RegisterOptions,
  IContainer,
  Module,
  AsyncModule,
  ContainerBuildContext,
} from "./types.js";
export { token } from "./types.js";

// Module installers
export { registerPersistence } from "./modules/persistence.module.js";
export { registerServices } from "./modules/services.module.js";
export { registerVerificationModule } from "./modules/verification.module.js";
export { registerVerificationQualityModule } from "./modules/verification-quality.module.js";
export { registerDomainVerifiersModule } from "./modules/domain-verifiers.module.js";
export { registerFactGraphModule } from "./modules/fact-graph.module.js";
export type { EvidenceGraphService } from "./modules/fact-graph.module.js";
export { registerCapModule } from "./modules/cap.module.js";
export { registerBillingModule } from "./modules/billing.module.js";
export { registerWebhooksModule } from "./modules/webhooks.module.js";
export { registerObservabilityModule } from "./modules/observability.module.js";
