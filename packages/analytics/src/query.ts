// Analytics query types and builder for filtering event streams
import type { IsoTimestamp } from "@veritas/core";
import type { AnalyticsEvent } from "./event.js";

export interface AnalyticsQuery {
  readonly from?: IsoTimestamp;
  readonly to?: IsoTimestamp;
  readonly organizationId?: string;
  readonly userId?: string;
  readonly eventNames?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
}

export interface AnalyticsQueryResult {
  readonly events: readonly AnalyticsEvent[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export interface QueryBuilder {
  from(ts: IsoTimestamp): QueryBuilder;
  to(ts: IsoTimestamp): QueryBuilder;
  forOrganization(id: string): QueryBuilder;
  forUser(id: string): QueryBuilder;
  withEventNames(...names: string[]): QueryBuilder;
  withLimit(n: number): QueryBuilder;
  withOffset(n: number): QueryBuilder;
  build(): AnalyticsQuery;
}

export function analyticsQuery(): QueryBuilder {
  let current: AnalyticsQuery = {};

  const builder: QueryBuilder = {
    from(ts) {
      current = { ...current, from: ts };
      return builder;
    },
    to(ts) {
      current = { ...current, to: ts };
      return builder;
    },
    forOrganization(id) {
      current = { ...current, organizationId: id };
      return builder;
    },
    forUser(id) {
      current = { ...current, userId: id };
      return builder;
    },
    withEventNames(...names) {
      current = { ...current, eventNames: names };
      return builder;
    },
    withLimit(n) {
      current = { ...current, limit: Math.max(1, Math.min(n, 1000)) };
      return builder;
    },
    withOffset(n) {
      current = { ...current, offset: Math.max(0, n) };
      return builder;
    },
    build() {
      return current;
    },
  };

  return builder;
}

export function matchesQuery(event: AnalyticsEvent, q: AnalyticsQuery): boolean {
  if (q.from && event.occurredAt < q.from) return false;
  if (q.to && event.occurredAt > q.to) return false;
  if (q.organizationId && event.organizationId !== q.organizationId) return false;
  if (q.userId && event.userId !== q.userId) return false;
  if (q.eventNames && !q.eventNames.includes(event.type)) return false;
  return true;
}
