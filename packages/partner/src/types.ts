// Shared type aliases and branded IDs for the partner domain.

import { type Id, newId, type IsoTimestamp } from "@veritas/core";
import { type OnboardingStep } from "./onboarding.js";

// ---------------------------------------------------------------------------
// Branded partner-domain IDs (only those not already exported by domain files)
// ---------------------------------------------------------------------------

export type PartnerAgreementId = Id<"pagree">;

export const newPartnerAgreementId = (): PartnerAgreementId => newId("pagree");
export const newRevenueShareId = (): Id<"revshare"> => newId("revshare");
export const newPartnerContactId = (): Id<"pcontact"> => newId("pcontact");
export const newOnboardingId = (): Id<"onboard"> => newId("onboard");

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/** Completion state of a single onboarding step. */
export type StepStatus = "not_started" | "in_progress" | "complete" | "failed";

// ---------------------------------------------------------------------------
// Lightweight value objects
// ---------------------------------------------------------------------------

/** Immutable snapshot of a completed onboarding step. */
export interface StepRecord {
  readonly step: OnboardingStep;
  readonly status: StepStatus;
  readonly completedAt: IsoTimestamp | null;
  readonly notes: string | null;
}

/** Revenue share split between Veritas and a partner. */
export interface RevenueSplit {
  readonly partnerBps: number; // basis points paid to partner (0–10000)
  readonly effectiveFrom: IsoTimestamp;
  readonly effectiveTo: IsoTimestamp | null;
}

/** A soft or hard quota applied to a partner. */
export interface QuotaLimit {
  readonly metric: string;        // e.g. "api_calls_per_day"
  readonly hardLimit: number;
  readonly softLimit: number;
  readonly resetPeriod: "hourly" | "daily" | "monthly";
}

/** A single contact person within a partner organisation. */
export interface ContactDetails {
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly phone: string | null;
}
