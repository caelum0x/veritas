// onboarding.ts: partner onboarding workflow — step tracking and state transitions.

import { z } from "zod";
import { newId, type Id, ok, err, type Result } from "@veritas/core";
import { PartnerNotFoundError, PartnerConflictError, PartnerOnboardingError } from "./errors.js";

export type OnboardingId = Id<"onboarding">;

export const OnboardingStepSchema = z.enum([
  "profile_submitted",
  "agreement_signed",
  "api_access_granted",
  "integration_verified",
  "completed",
]);
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const ONBOARDING_STEP_ORDER: readonly OnboardingStep[] = [
  "profile_submitted",
  "agreement_signed",
  "api_access_granted",
  "integration_verified",
  "completed",
];

export const OnboardingStatusSchema = z.enum(["in_progress", "completed", "abandoned"]);
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;

export const OnboardingStepRecordSchema = z.object({
  step: OnboardingStepSchema,
  completedAt: z.string().datetime(),
  notes: z.string().optional(),
});
export type OnboardingStepRecord = z.infer<typeof OnboardingStepRecordSchema>;

export const PartnerOnboardingSchema = z.object({
  id: z.string().startsWith("onboarding_"),
  partnerId: z.string().startsWith("partner_"),
  status: OnboardingStatusSchema,
  currentStep: OnboardingStepSchema,
  completedSteps: z.array(OnboardingStepRecordSchema),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PartnerOnboarding = z.infer<typeof PartnerOnboardingSchema>;

export function makeOnboarding(partnerId: string, now: string): PartnerOnboarding {
  return {
    id: newId("onboarding") as string,
    partnerId,
    status: "in_progress",
    currentStep: "profile_submitted",
    completedSteps: [],
    startedAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function advanceOnboardingStep(
  onboarding: PartnerOnboarding,
  step: OnboardingStep,
  now: string,
  notes?: string,
): Result<PartnerOnboarding> {
  const expectedIndex = ONBOARDING_STEP_ORDER.indexOf(onboarding.currentStep);
  const nextIndex = ONBOARDING_STEP_ORDER.indexOf(step);

  if (nextIndex !== expectedIndex + 1) {
    return err(
      PartnerOnboardingError.of(
        step,
        `Expected next step to be ${ONBOARDING_STEP_ORDER[expectedIndex + 1] ?? "none"}, got ${step}`,
      ),
    );
  }

  if (onboarding.status !== "in_progress") {
    return err(PartnerOnboardingError.of(step, `Onboarding is already ${onboarding.status}`));
  }

  const stepRecord: OnboardingStepRecord = { step, completedAt: now, ...(notes ? { notes } : {}) };
  const isCompleted = step === "completed";

  return ok({
    ...onboarding,
    currentStep: step,
    completedSteps: [...onboarding.completedSteps, stepRecord],
    status: isCompleted ? "completed" : "in_progress",
    completedAt: isCompleted ? now : null,
    updatedAt: now,
  });
}

export function abandonOnboarding(onboarding: PartnerOnboarding, now: string): Result<PartnerOnboarding> {
  if (onboarding.status === "completed") {
    return err(PartnerOnboardingError.of("abandon", "Cannot abandon a completed onboarding"));
  }
  return ok({ ...onboarding, status: "abandoned", updatedAt: now });
}

export interface OnboardingStore {
  save(onboarding: PartnerOnboarding): Promise<Result<PartnerOnboarding>>;
  findById(id: string): Promise<Result<PartnerOnboarding | null>>;
  findByPartnerId(partnerId: string): Promise<Result<PartnerOnboarding | null>>;
  update(onboarding: PartnerOnboarding): Promise<Result<PartnerOnboarding>>;
}

export class InMemoryOnboardingStore implements OnboardingStore {
  private readonly records = new Map<string, PartnerOnboarding>();

  async save(onboarding: PartnerOnboarding): Promise<Result<PartnerOnboarding>> {
    if (this.records.has(onboarding.id)) {
      return err(PartnerConflictError.of("PartnerOnboarding", onboarding.id));
    }
    this.records.set(onboarding.id, onboarding);
    return ok(onboarding);
  }

  async findById(id: string): Promise<Result<PartnerOnboarding | null>> {
    return ok(this.records.get(id) ?? null);
  }

  async findByPartnerId(partnerId: string): Promise<Result<PartnerOnboarding | null>> {
    const found = [...this.records.values()].find((o) => o.partnerId === partnerId) ?? null;
    return ok(found);
  }

  async update(onboarding: PartnerOnboarding): Promise<Result<PartnerOnboarding>> {
    if (!this.records.has(onboarding.id)) {
      return err(PartnerNotFoundError.of("PartnerOnboarding", onboarding.id));
    }
    this.records.set(onboarding.id, onboarding);
    return ok(onboarding);
  }
}
