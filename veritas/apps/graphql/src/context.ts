// GraphQL request context: authenticated principal, DataLoaders, and service refs
import type { IncomingMessage } from "node:http";
import type { Principal } from "@veritas/auth";
import type { Logger } from "@veritas/observability";
import type { ServiceContext } from "@veritas/services";
import type { Result } from "@veritas/core";
import type { Page } from "@veritas/core";
import type { ApiKey, CreateApiKey, Wallet, Invoice, Plan, Job } from "@veritas/contracts";
import type { ClaimLoader } from "./loaders/claim.loader.js";
import type { CitationLoader } from "./loaders/citation.loader.js";
import type { VerdictLoader } from "./loaders/verdict.loader.js";
import type { ReportLoader } from "./loaders/report.loader.js";
import type { ProvenanceLoader } from "./loaders/provenance.loader.js";
import type { JobLoader } from "./loaders/job.loader.js";
import type { OrderLoader } from "./loaders/order.loader.js";
import type { NegotiationLoader } from "./loaders/negotiation.loader.js";
import type { DeliveryLoader } from "./loaders/delivery.loader.js";
import type { AgentLoader } from "./loaders/agent.loader.js";
import type { ServiceLoader } from "./loaders/service.loader.js";
import type { ApiKeyLoader } from "./loaders/apiKey.loader.js";
import type { WalletLoader } from "./loaders/wallet.loader.js";
import type { UsageLoader } from "./loaders/usage.loader.js";
import type { InvoiceLoader } from "./loaders/invoice.loader.js";
import type { PlanLoader } from "./loaders/plan.loader.js";
import type { SubscriptionLoader } from "./loaders/subscription.loader.js";
import type { WebhookLoader } from "./loaders/webhook.loader.js";
import type { AuditLogLoader } from "./loaders/auditLog.loader.js";
import type { UserLoader } from "./loaders/user.loader.js";
import type { OrganizationLoader } from "./loaders/organization.loader.js";
import type { SessionLoader } from "./loaders/session.loader.js";
import type { SettlementLoader } from "./loaders/settlement.loader.js";
import type { TransactionLoader } from "./loaders/transaction.loader.js";
import type { TenantLoader } from "./loaders/tenant.loader.js";

/** All DataLoaders available in a GraphQL request. */
export interface Loaders {
  readonly claim: ClaimLoader;
  readonly citation: CitationLoader;
  readonly verdict: VerdictLoader;
  readonly report: ReportLoader;
  readonly provenance: ProvenanceLoader;
  readonly job: JobLoader;
  readonly order: OrderLoader;
  readonly negotiation: NegotiationLoader;
  readonly delivery: DeliveryLoader;
  readonly agent: AgentLoader;
  readonly service: ServiceLoader;
  readonly apiKey: ApiKeyLoader;
  readonly wallet: WalletLoader;
  readonly usage: UsageLoader;
  readonly invoice: InvoiceLoader;
  readonly plan: PlanLoader;
  readonly subscription: SubscriptionLoader;
  readonly webhook: WebhookLoader;
  readonly auditLog: AuditLogLoader;
  readonly user: UserLoader;
  readonly organization: OrganizationLoader;
  readonly session: SessionLoader;
  readonly settlement: SettlementLoader;
  readonly transaction: TransactionLoader;
  readonly tenant: TenantLoader;
}

/** Service interfaces available in the GraphQL context. */
export interface GqlServices {
  readonly apiKey: {
    findById(id: string): Promise<ApiKey | null | undefined>;
    findByOrganization(orgId: string): Promise<Result<ApiKey[]>>;
    create(payload: CreateApiKey): Promise<Result<ApiKey>>;
    revoke(id: string): Promise<Result<void>>;
  };
  readonly billing: {
    getInvoice(id: string): Promise<Result<Invoice | null>>;
    listInvoices(opts: { organizationId?: string; limit: number; cursor?: string }): Promise<Result<{ items: Invoice[]; nextCursor: string | null; total: number }>>;
    createInvoice(input: unknown): Promise<Result<Invoice>>;
    updateInvoice(id: string, input: unknown): Promise<Result<Invoice>>;
    voidInvoice(id: string): Promise<Result<Invoice>>;
    getInvoicesByIds(ids: string[]): Promise<Result<Invoice[]>>;
    getPlan(id: string): Promise<Result<Plan | null>>;
    listPlans(opts: { activeOnly: boolean; limit: number; cursor?: string }): Promise<Result<{ items: Plan[]; nextCursor: string | null; total: number }>>;
    createPlan(input: unknown): Promise<Result<Plan>>;
    updatePlan(id: string, input: unknown): Promise<Result<Plan>>;
    archivePlan(id: string): Promise<Result<Plan>>;
    getPlansByIds(ids: string[]): Promise<Result<Plan[]>>;
  };
  readonly wallet: {
    findById(id: string): Promise<Wallet | null | undefined>;
    findByOrganization(orgId: string): Promise<Result<Wallet | null>>;
    create(opts: { organizationId: string }): Promise<Result<Wallet>>;
  };
  readonly verificationJob: {
    list(ctx: ServiceContext, opts: { status?: Job["status"] | undefined; limit: number; cursor?: string }): Promise<Result<Page<Job>>>;
    submit(ctx: ServiceContext, input: { text?: string; claims?: string[]; context?: string; allowedDomains?: string[]; idempotencyKey?: string }): Promise<Result<{ id: string }>>;
    cancel(ctx: ServiceContext, opts: { jobId: string }): Promise<Result<unknown>>;
  };
}

/** Per-request GraphQL execution context. */
export interface GqlContext {
  readonly principal: Principal | undefined;
  readonly serviceCtx: ServiceContext | undefined;
  readonly services: GqlServices;
  readonly loaders: Loaders;
  readonly logger: Logger;
  readonly requestId: string;
}

export type ContextFactory = (req: IncomingMessage) => Promise<GqlContext>;
