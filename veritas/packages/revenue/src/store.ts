// In-memory revenue store: persists snapshots, cohorts, and reports for querying.

import { IsoTimestamp } from "@veritas/core";
import { MrrSnapshot, SubscriptionRecord } from "./mrr.js";
import { RevenueForecast } from "./forecast.js";
import { RevenueReport } from "./report.js";
import { MarketingSpend, AcquisitionCohort } from "./cac.js";

export interface RevenueStore {
  // Subscriptions
  addSubscription(record: SubscriptionRecord): void;
  removeSubscription(organizationId: string, planId: string): void;
  listSubscriptions(): readonly SubscriptionRecord[];

  // MRR snapshots
  saveMrrSnapshot(snapshot: MrrSnapshot): void;
  listMrrSnapshots(): readonly MrrSnapshot[];
  latestMrrSnapshot(): MrrSnapshot | null;

  // Marketing spend
  saveMarketingSpend(spend: MarketingSpend): void;
  listMarketingSpends(): readonly MarketingSpend[];

  // Acquisition cohorts
  saveAcquisitionCohort(cohort: AcquisitionCohort): void;
  listAcquisitionCohorts(): readonly AcquisitionCohort[];

  // Forecasts
  saveForecast(forecast: RevenueForecast): void;
  latestForecast(): RevenueForecast | null;

  // Reports
  saveReport(report: RevenueReport): void;
  listReports(): readonly RevenueReport[];
  reportByDate(generatedAt: IsoTimestamp): RevenueReport | null;
}

/** Creates a new in-memory RevenueStore instance. */
export function createRevenueStore(): RevenueStore {
  const subscriptions = new Map<string, SubscriptionRecord>();
  const mrrSnapshots: MrrSnapshot[] = [];
  const marketingSpends: MarketingSpend[] = [];
  const acquisitionCohorts: AcquisitionCohort[] = [];
  const forecasts: RevenueForecast[] = [];
  const reports = new Map<string, RevenueReport>();

  function subKey(organizationId: string, planId: string): string {
    return `${organizationId}::${planId}`;
  }

  return {
    addSubscription(record) {
      subscriptions.set(subKey(record.organizationId, record.planId), record);
    },

    removeSubscription(organizationId, planId) {
      subscriptions.delete(subKey(organizationId, planId));
    },

    listSubscriptions() {
      return [...subscriptions.values()];
    },

    saveMrrSnapshot(snapshot) {
      mrrSnapshots.push(snapshot);
    },

    listMrrSnapshots() {
      return [...mrrSnapshots].sort(
        (a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime()
      );
    },

    latestMrrSnapshot() {
      if (mrrSnapshots.length === 0) return null;
      return mrrSnapshots.reduce((latest, s) =>
        new Date(s.asOf) > new Date(latest.asOf) ? s : latest
      );
    },

    saveMarketingSpend(spend) {
      marketingSpends.push(spend);
    },

    listMarketingSpends() {
      return [...marketingSpends].sort(
        (a, b) => a.periodStartMs - b.periodStartMs
      );
    },

    saveAcquisitionCohort(cohort) {
      acquisitionCohorts.push(cohort);
    },

    listAcquisitionCohorts() {
      return [...acquisitionCohorts].sort(
        (a, b) => a.periodStartMs - b.periodStartMs
      );
    },

    saveForecast(forecast) {
      forecasts.push(forecast);
    },

    latestForecast() {
      if (forecasts.length === 0) return null;
      return forecasts.reduce((latest, f) =>
        new Date(f.generatedAt) > new Date(latest.generatedAt) ? f : latest
      );
    },

    saveReport(report) {
      reports.set(report.generatedAt, report);
    },

    listReports() {
      return [...reports.values()].sort(
        (a, b) =>
          new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
      );
    },

    reportByDate(generatedAt) {
      return reports.get(generatedAt) ?? null;
    },
  };
}
