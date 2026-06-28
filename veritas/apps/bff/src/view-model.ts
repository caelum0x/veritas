// View-model transformers: shape upstream API responses for UI consumption

import type {
  Claim,
  Source,
  VerdictRecord,
  Order,
  Report,
  Usage,
  Webhook,
  ApiKey,
  Agent,
  Organization,
  Plan,
  Subscription,
  Invoice,
} from "@veritas/contracts";
import { formatScorePercent, clampScore } from "@veritas/core";

export interface ClaimViewModel {
  readonly id: string;
  readonly text: string;
  readonly verdict: string | null;
  readonly confidenceLabel: string | null;
  readonly sourcesCount: number;
  readonly createdAt: string;
}

export interface SourceViewModel {
  readonly id: string;
  readonly url: string;
  readonly title: string | null;
  readonly tier: string;
  readonly trustScore: string;
  readonly createdAt: string;
}

export interface OrderViewModel {
  readonly id: string;
  readonly status: string;
  readonly claimText: string;
  readonly verdict: string | null;
  readonly cost: string;
  readonly createdAt: string;
}

export interface ReportViewModel {
  readonly id: string;
  readonly title: string;
  readonly claimsTotal: number;
  readonly verdictCounts: Record<string, number>;
  readonly createdAt: string;
}

export interface UsageSummaryViewModel {
  readonly metric: string;
  readonly value: number;
  readonly periodStart: string;
  readonly periodEnd: string;
}

export interface WebhookViewModel {
  readonly id: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly enabled: boolean;
  readonly createdAt: string;
}

export interface ApiKeyViewModel {
  readonly id: string;
  readonly name: string;
  readonly prefix: string;
  readonly scopes: readonly string[];
  readonly createdAt: string;
  readonly expiresAt: string | null;
}

export interface AgentViewModel {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly capabilities: readonly string[];
  readonly createdAt: string;
}

export interface BillingViewModel {
  readonly plan: string;
  readonly status: string;
  readonly currentPeriodEnd: string | null;
  readonly invoiceCount: number;
}

export function toClaimViewModel(claim: Claim): ClaimViewModel {
  return {
    id: claim.id,
    text: claim.text,
    verdict: claim.verdict ?? null,
    confidenceLabel:
      claim.confidence != null ? formatScorePercent(clampScore(claim.confidence)) : null,
    sourcesCount: 0,
    createdAt: claim.createdAt,
  };
}

export function toSourceViewModel(source: Source): SourceViewModel {
  return {
    id: source.id,
    url: source.url,
    title: source.title ?? null,
    tier: source.tier,
    trustScore: source.tier,
    createdAt: source.createdAt,
  };
}

export function toOrderViewModel(order: Order, claimText: string): OrderViewModel {
  return {
    id: order.id,
    status: order.status,
    claimText,
    verdict: null,
    cost: `${order.price.amount}`,
    createdAt: order.createdAt,
  };
}

export function toReportViewModel(report: Report): ReportViewModel {
  return {
    id: report.id,
    title: report.summary,
    claimsTotal:
      (report.counts.supported ?? 0) +
      (report.counts.refuted ?? 0) +
      (report.counts.unverifiable ?? 0),
    verdictCounts: report.counts as unknown as Record<string, number>,
    createdAt: report.createdAt,
  };
}

export function toUsageSummaryViewModel(usage: Usage): UsageSummaryViewModel {
  return {
    metric: usage.metric,
    value: usage.quantity,
    periodStart: usage.recordedAt,
    periodEnd: usage.recordedAt,
  };
}

export function toWebhookViewModel(webhook: Webhook): WebhookViewModel {
  return {
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    enabled: webhook.active,
    createdAt: webhook.createdAt,
  };
}

export function toApiKeyViewModel(key: ApiKey): ApiKeyViewModel {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    scopes: key.scopes,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt ?? null,
  };
}

export function toAgentViewModel(agent: Agent): AgentViewModel {
  return {
    id: agent.id,
    name: agent.name,
    status: agent.trusted ? "trusted" : "untrusted",
    capabilities: [],
    createdAt: agent.createdAt,
  };
}

export function toBillingViewModel(
  subscription: Subscription | null,
  plan: Plan | null,
  invoices: readonly Invoice[]
): BillingViewModel {
  return {
    plan: plan?.name ?? "free",
    status: subscription?.status ?? "inactive",
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    invoiceCount: invoices.length,
  };
}
