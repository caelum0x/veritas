// Churn features: numeric feature vector extracted from account activity for ML-style scoring
import { z } from "zod";
import { type ChurnSignal, SignalKind } from "./signal.js";

export const FeatureVectorSchema = z.object({
  accountId: z.string(),
  /** Days since last login */
  daysSinceLogin: z.number().nonnegative(),
  /** Verification volume last 30 days */
  verificationsLast30d: z.number().nonnegative(),
  /** Verification volume prior 30 days (days 31-60) */
  verificationsLast60d: z.number().nonnegative(),
  /** Ratio current/prior volume; 0 if no prior activity */
  volumeTrend: z.number(),
  /** Number of support tickets in last 30 days */
  supportTickets30d: z.number().nonnegative(),
  /** Number of payment failures in last 90 days */
  paymentFailures90d: z.number().nonnegative(),
  /** Did user view cancellation page in last 30 days */
  viewedCancellationPage: z.boolean(),
  /** NPS score [-1 = not collected, 0-10] */
  npsScore: z.number().min(-1).max(10),
  /** Total signal weight in last 30 days */
  totalSignalWeight30d: z.number().nonnegative(),
  /** Count of distinct negative signal kinds */
  distinctSignalKinds: z.number().nonnegative(),
});
export type FeatureVector = z.infer<typeof FeatureVectorSchema>;

const MS_30D = 30 * 24 * 60 * 60 * 1000;
const MS_60D = 60 * 24 * 60 * 60 * 1000;
const MS_90D = 90 * 24 * 60 * 60 * 1000;

export interface AccountActivity {
  readonly accountId: string;
  readonly lastLoginAt: string | null;
  readonly verificationsLast30d: number;
  readonly verificationsLast60d: number;
  readonly npsScore: number | null;
}

/** Extract a feature vector for a single account given its activity and signals */
export const extractFeatures = (
  activity: AccountActivity,
  signals: readonly ChurnSignal[],
): FeatureVector => {
  const now = Date.now();
  const accountSignals = signals.filter((s) => s.accountId === activity.accountId);

  const daysSinceLogin = activity.lastLoginAt
    ? (now - new Date(activity.lastLoginAt).getTime()) / 86400000
    : 999;

  const signals30d = accountSignals.filter(
    (s) => now - new Date(s.occurredAt).getTime() <= MS_30D,
  );

  const supportTickets30d = signals30d.filter((s) => s.kind === "support_ticket").length;

  const paymentFailures90d = accountSignals.filter(
    (s) =>
      s.kind === "payment_failure" &&
      now - new Date(s.occurredAt).getTime() <= MS_90D,
  ).length;

  const viewedCancellationPage = signals30d.some(
    (s) => s.kind === "cancellation_page_view",
  );

  const totalSignalWeight30d = signals30d.reduce((acc, s) => acc + s.weight, 0);

  const distinctSignalKinds = new Set(signals30d.map((s) => s.kind)).size;

  const volPrior = activity.verificationsLast60d - activity.verificationsLast30d;
  const volumeTrend =
    volPrior > 0
      ? activity.verificationsLast30d / volPrior
      : activity.verificationsLast30d > 0
      ? 1
      : 0;

  return {
    accountId: activity.accountId,
    daysSinceLogin,
    verificationsLast30d: activity.verificationsLast30d,
    verificationsLast60d: activity.verificationsLast60d,
    volumeTrend,
    supportTickets30d,
    paymentFailures90d,
    viewedCancellationPage,
    npsScore: activity.npsScore ?? -1,
    totalSignalWeight30d,
    distinctSignalKinds,
  };
};

/** Normalise a feature vector to 0-1 range for model input */
export const normalizeFeatures = (fv: FeatureVector): Record<string, number> => ({
  daysSinceLogin: Math.min(fv.daysSinceLogin / 90, 1),
  verificationsLast30d: Math.min(fv.verificationsLast30d / 100, 1),
  volumeTrend: Math.min(Math.max(fv.volumeTrend, 0), 2) / 2,
  supportTickets30d: Math.min(fv.supportTickets30d / 5, 1),
  paymentFailures90d: Math.min(fv.paymentFailures90d / 3, 1),
  viewedCancellationPage: fv.viewedCancellationPage ? 1 : 0,
  npsScore: fv.npsScore < 0 ? 0.5 : fv.npsScore / 10,
  totalSignalWeight30d: Math.min(fv.totalSignalWeight30d / 5, 1),
  distinctSignalKinds: Math.min(fv.distinctSignalKinds / SignalKind.options.length, 1),
});
