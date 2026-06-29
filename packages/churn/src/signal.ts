// Churn signals: observable user behaviour events that indicate disengagement risk
import { z } from "zod";
import { Brand, brand } from "@veritas/core";

export type SignalId = Brand<string, "SignalId">;
export const newSignalId = (): SignalId => brand<string, "SignalId">(`sig_${Date.now()}_${Math.random().toString(36).slice(2)}`);

export const SignalKind = z.enum([
  "login_gap",
  "feature_disuse",
  "support_ticket",
  "payment_failure",
  "downgrade_intent",
  "api_error_spike",
  "export_request",
  "cancellation_page_view",
  "low_verification_volume",
  "negative_nps",
]);
export type SignalKind = z.infer<typeof SignalKind>;

export const SignalWeightSchema = z.number().min(0).max(1);

export const ChurnSignalSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  kind: SignalKind,
  weight: SignalWeightSchema,
  occurredAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});
export type ChurnSignal = z.infer<typeof ChurnSignalSchema>;

/** Default weights per signal kind for risk scoring */
export const SIGNAL_WEIGHTS: Record<SignalKind, number> = {
  login_gap: 0.6,
  feature_disuse: 0.5,
  support_ticket: 0.4,
  payment_failure: 0.9,
  downgrade_intent: 0.85,
  api_error_spike: 0.45,
  export_request: 0.7,
  cancellation_page_view: 0.95,
  low_verification_volume: 0.55,
  negative_nps: 0.8,
};

/** Build a churn signal with default weight for its kind */
export const buildSignal = (
  accountId: string,
  kind: SignalKind,
  metadata?: Record<string, unknown>,
): ChurnSignal => ({
  id: newSignalId() as unknown as string,
  accountId,
  kind,
  weight: SIGNAL_WEIGHTS[kind],
  occurredAt: new Date().toISOString(),
  metadata,
});

/** Filter signals newer than a given age in milliseconds */
export const recentSignals = (signals: readonly ChurnSignal[], withinMs: number): ChurnSignal[] => {
  const cutoff = Date.now() - withinMs;
  return signals.filter((s) => new Date(s.occurredAt).getTime() >= cutoff);
};

/** Group signals by account */
export const groupSignalsByAccount = (
  signals: readonly ChurnSignal[],
): Map<string, ChurnSignal[]> => {
  const map = new Map<string, ChurnSignal[]>();
  for (const sig of signals) {
    const existing = map.get(sig.accountId) ?? [];
    map.set(sig.accountId, [...existing, sig]);
  }
  return map;
};
