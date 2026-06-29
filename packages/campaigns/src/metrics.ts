// Collects and aggregates open/click/send metrics for campaigns.

import { ok, type Result } from "@veritas/core";
import type { MetricEvent } from "./types.js";
import { CampaignNotFoundError } from "./errors.js";

export interface MetricsSummary {
  readonly campaignId: string;
  readonly sent: number;
  readonly delivered: number;
  readonly opened: number;
  readonly clicked: number;
  readonly bounced: number;
  readonly unsubscribed: number;
  readonly openRate: number;
  readonly clickRate: number;
  readonly bounceRate: number;
}

export interface VariantMetrics {
  readonly variantId: string;
  readonly summary: MetricsSummary;
}

/** In-memory metrics store keyed by campaignId. */
export class CampaignMetricsStore {
  private readonly events = new Map<string, MetricEvent[]>();

  record(event: MetricEvent): void {
    const existing = this.events.get(event.campaignId) ?? [];
    this.events.set(event.campaignId, [...existing, event]);
  }

  recordBatch(events: ReadonlyArray<MetricEvent>): void {
    for (const event of events) {
      this.record(event);
    }
  }

  getSummary(
    campaignId: string,
  ): Result<MetricsSummary, CampaignNotFoundError> {
    const all = this.events.get(campaignId);
    if (all === undefined) {
      return ok(emptyMetrics(campaignId));
    }
    return ok(computeSummary(campaignId, all));
  }

  getVariantBreakdown(
    campaignId: string,
  ): Result<ReadonlyArray<VariantMetrics>, CampaignNotFoundError> {
    const all = this.events.get(campaignId) ?? [];
    const byVariant = new Map<string, MetricEvent[]>();

    for (const event of all) {
      const vid = event.variantId ?? "__default__";
      const existing = byVariant.get(vid) ?? [];
      byVariant.set(vid, [...existing, event]);
    }

    const breakdown: VariantMetrics[] = [];
    for (const [variantId, variantEvents] of byVariant) {
      breakdown.push({
        variantId,
        summary: computeSummary(campaignId, variantEvents),
      });
    }

    return ok(breakdown);
  }

  allCampaignIds(): ReadonlyArray<string> {
    return [...this.events.keys()];
  }
}

function emptyMetrics(campaignId: string): MetricsSummary {
  return {
    campaignId,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    unsubscribed: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
  };
}

function computeSummary(
  campaignId: string,
  events: ReadonlyArray<MetricEvent>,
): MetricsSummary {
  let sent = 0, delivered = 0, opened = 0, clicked = 0, bounced = 0, unsubscribed = 0;

  for (const e of events) {
    switch (e.event) {
      case "sent": sent++; break;
      case "delivered": delivered++; break;
      case "opened": opened++; break;
      case "clicked": clicked++; break;
      case "bounced": bounced++; break;
      case "unsubscribed": unsubscribed++; break;
    }
  }

  const base = sent > 0 ? sent : 1;
  return {
    campaignId,
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    unsubscribed,
    openRate: opened / base,
    clickRate: clicked / base,
    bounceRate: bounced / base,
  };
}
