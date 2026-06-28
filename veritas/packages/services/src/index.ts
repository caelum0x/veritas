// Public re-exports for the @veritas/services package.
export { BaseService } from "./base-service.js";
export type { BaseServiceDeps } from "./base-service.js";

export {
  makeServiceContext,
  withTrace,
  systemContext,
} from "./service-context.js";
export type { ServiceContext, Principal } from "./service-context.js";

export {
  ResourceNotFoundError,
  DuplicateResourceError,
  ServiceValidationError,
  NotAuthenticatedError,
  InsufficientPermissionsError,
  QuotaExceededError,
  DependencyUnavailableError,
  PreconditionFailedError,
  IdempotencyConflictError,
  AppError,
} from "./errors.js";

export {
  serviceCall,
  serviceCallSync,
  combineResults,
  guard,
  ok,
  err,
} from "./result.js";
export type { Result } from "./result.js";

// Domain service re-exports
export { VerificationJobService } from "./verification-job/verification-job.service.js";
export type {
  SubmitJobInput,
  GetJobInput,
  CancelJobInput,
  ListJobsInput,
  JobView,
} from "./verification-job/verification-job.dto.js";

export { ReportService } from "./report/report.service.js";
export type {
  GetReportByIdInput,
  GetReportByVerificationIdInput,
  ListReportsInput,
  DeleteReportInput,
  ReportView,
} from "./report/report.dto.js";

export { AgentService } from "./agent/agent.service.js";
export type {
  RegisterAgentInput,
  UpdateAgentInput,
  ListAgentsInput,
  AgentOutput,
  AgentListOutput,
  SetAgentTrustInput,
} from "./agent/agent.dto.js";

export { ServiceCatalogService } from "./service-catalog/service-catalog.service.js";
export type {
  CreateServiceInput,
  UpdateServiceInput,
  ListServicesInput,
  ServiceOutput,
} from "./service-catalog/service-catalog.dto.js";

export { ApiKeyService } from "./api-key/api-key.service.js";
export type {
  IssueApiKeyInput,
  ListApiKeysInput,
  RevokeApiKeyInput,
  ValidateApiKeyInput,
  ApiKeyOutput,
  ApiKeyCreatedOutput,
  ApiKeyListOutput,
} from "./api-key/api-key.dto.js";

export { OrderService } from "./order/order.service.js";
export type {
  CreateOrderInput,
  UpdateOrderInput,
  ListOrdersInput,
  OrderOutput,
} from "./order/order.dto.js";

export { NegotiationService } from "./negotiation/negotiation.service.js";
export type {
  CreateNegotiationInput,
  UpdateNegotiationInput,
  NegotiationOutput,
} from "./negotiation/negotiation.dto.js";

export { DeliveryService } from "./delivery/delivery.service.js";
export type {
  CreateDeliveryInput,
  DeliveryOutput,
} from "./delivery/delivery.dto.js";

export { WalletService } from "./wallet/wallet.service.js";
export type {
  CreateWalletInput,
  WalletOutput,
} from "./wallet/wallet.dto.js";

export { UsageMeteringService } from "./usage-metering/usage-metering.service.js";
export type {
  RecordUsageInput,
  ListUsageInput,
  UsageOutput,
} from "./usage-metering/usage-metering.dto.js";

export { InvoiceService } from "./invoice/invoice.service.js";
export type {
  CreateInvoiceInput,
  ListInvoicesInput,
  InvoiceOutput,
} from "./invoice/invoice.dto.js";

export { PlanService } from "./plan/plan.service.js";
export type {
  CreatePlanInput,
  UpdatePlanInput,
  ListPlansInput,
  PlanOutput,
} from "./plan/plan.dto.js";

export { SubscriptionService } from "./subscription/subscription.service.js";
export type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionOutput,
} from "./subscription/subscription.dto.js";

export { WebhookService } from "./webhook/webhook.service.js";
export type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookOutput,
} from "./webhook/webhook.dto.js";

export { AuditLogService } from "./audit-log/audit-log.service.js";
export type {
  CreateAuditLogInput,
  ListAuditLogsInput,
  AuditLogOutput,
} from "./audit-log/audit-log.dto.js";

export { UserService } from "./user/user.service.js";
export type {
  CreateUserInput,
  UpdateUserInput,
  UserOutput,
} from "./user/user.dto.js";

export { OrganizationService } from "./organization/organization.service.js";
export type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationOutput,
} from "./organization/organization.dto.js";

export { MembershipService } from "./membership/membership.service.js";
export type {
  CreateMembershipInput,
  UpdateMembershipInput,
  MembershipOutput,
} from "./membership/membership.dto.js";

export { SessionService } from "./session/session.service.js";
export type {
  CreateSessionInput,
  SessionOutput,
} from "./session/session.dto.js";

export { SettlementService } from "./settlement/settlement.service.js";
export type {
  CreateSettlementInput,
  UpdateSettlementInput,
  SettlementOutput,
} from "./settlement/settlement.dto.js";

export { TransactionService } from "./transaction/transaction.service.js";
export type {
  CreateTransactionInput,
  ListTransactionsInput,
  TransactionOutput,
} from "./transaction/transaction.dto.js";

export { NotificationService } from "./notification/notification.service.js";
export type {
  CreateNotificationInput,
  ListNotificationsInput,
  NotificationOutput,
} from "./notification/notification.dto.js";

export { IdempotencyService } from "./idempotency/idempotency.service.js";
export type {
  CreateIdempotencyKeyInput,
  IdempotencyKeyOutput,
} from "./idempotency/idempotency.dto.js";

export { RateLimitService } from "./rate-limit/rate-limit.service.js";
export type {
  CheckRateLimitInput,
  ResetRateLimitInput,
  GetRateLimitStatusInput,
  RateLimitStatusOutput,
  RateLimitCheckResult,
} from "./rate-limit/rate-limit.dto.js";

export { AgentRegistrationService } from "./agent-registration/agent-registration.service.js";
export type {
  InitiateRegistrationInput,
  ApproveRegistrationInput,
  SuspendRegistrationInput,
  RevokeRegistrationInput,
  ReactivateRegistrationInput,
  ListRegistrationsInput,
  AgentRegistrationOutput,
  AgentRegistrationListOutput,
} from "./agent-registration/agent-registration.dto.js";

export { PricingService } from "./pricing/pricing.service.js";
export type {
  ComputePriceInput,
  EstimateMonthlyInput,
  GetPricingTableInput,
  ComputedPriceOutput,
  MonthlyEstimateOutput,
  PricingTableOutput,
} from "./pricing/pricing.dto.js";

export { QuotaService } from "./quota/quota.service.js";
export type {
  CheckQuotaInput,
  GetQuotaStatusInput,
  ResetQuotaInput,
  SetQuotaOverrideInput,
  QuotaCheckOutput,
  QuotaStatusOutput,
} from "./quota/quota.dto.js";

export { ExportService } from "./export/export.service.js";
export type {
  RequestExportInput,
  GetExportInput,
  ListExportsInput,
  CancelExportInput,
  DownloadExportInput,
  ExportJobOutput,
  ListExportsOutput,
  DownloadExportOutput,
} from "./export/export.dto.js";
