// Shared types and interfaces for the developer portal module
import { z } from "zod";
import { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";

/** Generic async portal operation result */
export type PortalResult<T> = Promise<Result<T, AppError>>;

/** Pagination parameters for portal list queries */
export const PortalPageRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type PortalPageRequest = z.infer<typeof PortalPageRequestSchema>;

/** Paginated response wrapper */
export interface PortalPage<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | undefined;
  readonly total: number;
}

/** Filter for listing developer apps */
export const ListAppsFilterSchema = z.object({
  organizationId: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.enum(["active", "suspended", "deleted"]).optional(),
});
export type ListAppsFilter = z.infer<typeof ListAppsFilterSchema>;

/** Filter for listing API keys */
export const ListApiKeysFilterSchema = z.object({
  appId: z.string().optional(),
  environment: z.enum(["development", "staging", "production"]).optional(),
  revoked: z.boolean().optional(),
});
export type ListApiKeysFilter = z.infer<typeof ListApiKeysFilterSchema>;

/** Filter for listing usage records */
export const ListUsageFilterSchema = z.object({
  appId: z.string(),
  metric: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type ListUsageFilter = z.infer<typeof ListUsageFilterSchema>;

/** Portal audit event kinds */
export const PortalEventKindSchema = z.enum([
  "app.created",
  "app.updated",
  "app.suspended",
  "app.activated",
  "app.deleted",
  "api_key.created",
  "api_key.revoked",
  "webhook.created",
  "webhook.updated",
  "webhook.deleted",
  "team.member_added",
  "team.member_removed",
  "environment.created",
  "environment.deleted",
]);
export type PortalEventKind = z.infer<typeof PortalEventKindSchema>;

/** Lightweight audit trail entry for portal operations */
export interface PortalAuditEntry {
  readonly id: string;
  readonly kind: PortalEventKind;
  readonly actorId: string;
  readonly appId: string;
  readonly payload: Record<string, unknown>;
  readonly occurredAt: string;
}

/** Store interface for developer portal persistence */
export interface PortalStore {
  readonly apps: AppRepository;
  readonly apiKeys: ApiKeyRepository;
  readonly webhooks: WebhookRepository;
  readonly teams: TeamRepository;
  readonly environments: EnvironmentRepository;
  readonly usage: UsageRepository;
  readonly quotas: QuotaRepository;
}

/** Minimal repository shape — implementations handle storage details */
export interface AppRepository {
  findById(id: string): PortalResult<import("./app.js").DeveloperApp>;
  list(filter: ListAppsFilter, page: PortalPageRequest): PortalResult<PortalPage<import("./app.js").DeveloperApp>>;
  save(app: import("./app.js").DeveloperApp): PortalResult<import("./app.js").DeveloperApp>;
  delete(id: string): PortalResult<void>;
}

export interface ApiKeyRepository {
  findById(id: string): PortalResult<import("./api-key.js").PortalApiKey>;
  findByHash(hash: string): PortalResult<import("./api-key.js").PortalApiKey>;
  list(filter: ListApiKeysFilter, page: PortalPageRequest): PortalResult<PortalPage<import("./api-key.js").PortalApiKey>>;
  save(key: import("./api-key.js").PortalApiKey): PortalResult<import("./api-key.js").PortalApiKey>;
}

export interface WebhookRepository {
  findById(id: string): PortalResult<import("./webhook-config.js").WebhookConfig>;
  listByApp(appId: string, page: PortalPageRequest): PortalResult<PortalPage<import("./webhook-config.js").WebhookConfig>>;
  save(webhook: import("./webhook-config.js").WebhookConfig): PortalResult<import("./webhook-config.js").WebhookConfig>;
  delete(id: string): PortalResult<void>;
}

export interface TeamRepository {
  findMember(appId: string, userId: string): PortalResult<import("./team.js").TeamMember>;
  listMembers(appId: string, page: PortalPageRequest): PortalResult<PortalPage<import("./team.js").TeamMember>>;
  save(member: import("./team.js").TeamMember): PortalResult<import("./team.js").TeamMember>;
  remove(appId: string, userId: string): PortalResult<void>;
}

export interface EnvironmentRepository {
  findById(id: string): PortalResult<import("./environment.js").AppEnvironment>;
  listByApp(appId: string): PortalResult<readonly import("./environment.js").AppEnvironment[]>;
  save(env: import("./environment.js").AppEnvironment): PortalResult<import("./environment.js").AppEnvironment>;
  delete(id: string): PortalResult<void>;
}

export interface UsageRepository {
  list(filter: ListUsageFilter, page: PortalPageRequest): PortalResult<PortalPage<import("./usage-view.js").AppUsageView>>;
  record(entry: import("./usage-view.js").AppUsageView): PortalResult<void>;
}

export interface QuotaRepository {
  findByApp(appId: string): PortalResult<import("./quota-view.js").AppQuotaView>;
  save(quota: import("./quota-view.js").AppQuotaView): PortalResult<import("./quota-view.js").AppQuotaView>;
}
