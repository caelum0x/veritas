// MFA policy definitions — rules for when and how MFA is required per user/role/org.

import { z } from "zod";
import { type FactorKind, FactorKindSchema } from "./factor.js";

export const MfaRequirementSchema = z.enum(["none", "optional", "required", "enforced"]);
export type MfaRequirement = z.infer<typeof MfaRequirementSchema>;

export const MfaPolicySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(""),
  requirement: MfaRequirementSchema,
  allowedFactors: z.array(FactorKindSchema).min(1),
  minimumFactors: z.number().int().positive().default(1),
  gracePeriodSeconds: z.number().int().nonnegative().default(0),
  rememberDeviceDays: z.number().int().nonnegative().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MfaPolicy = z.infer<typeof MfaPolicySchema>;

export const DEFAULT_POLICY: Omit<MfaPolicy, "id" | "createdAt" | "updatedAt"> = {
  name: "default",
  description: "Default MFA policy — TOTP optional",
  requirement: "optional",
  allowedFactors: ["totp", "hotp", "webauthn", "recovery"],
  minimumFactors: 1,
  gracePeriodSeconds: 0,
  rememberDeviceDays: 30,
};

export const STRICT_POLICY: Omit<MfaPolicy, "id" | "createdAt" | "updatedAt"> = {
  name: "strict",
  description: "Strict MFA policy — TOTP or WebAuthn required",
  requirement: "enforced",
  allowedFactors: ["totp", "webauthn"],
  minimumFactors: 1,
  gracePeriodSeconds: 0,
  rememberDeviceDays: 0,
};

export interface PolicyRepository {
  findById(id: string): Promise<MfaPolicy | null>;
  findByName(name: string): Promise<MfaPolicy | null>;
  listAll(): Promise<MfaPolicy[]>;
  create(policy: MfaPolicy): Promise<MfaPolicy>;
  update(policy: MfaPolicy): Promise<MfaPolicy>;
  delete(id: string): Promise<void>;
}

export function isMfaRequired(policy: MfaPolicy): boolean {
  return policy.requirement === "required" || policy.requirement === "enforced";
}

export function isFactorAllowed(policy: MfaPolicy, kind: FactorKind): boolean {
  return policy.allowedFactors.includes(kind);
}

export function isWithinGracePeriod(
  policy: MfaPolicy,
  enrollmentTime: Date,
  now: Date = new Date()
): boolean {
  if (policy.gracePeriodSeconds <= 0) return false;
  const elapsed = (now.getTime() - enrollmentTime.getTime()) / 1000;
  return elapsed < policy.gracePeriodSeconds;
}

export function isDeviceRememberValid(
  policy: MfaPolicy,
  lastVerifiedAt: Date,
  now: Date = new Date()
): boolean {
  if (policy.rememberDeviceDays <= 0) return false;
  const elapsedDays = (now.getTime() - lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays < policy.rememberDeviceDays;
}
