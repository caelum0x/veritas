// Maps @veritas/partner domain types to HTTP response shapes
import type {
  Partner,
  PartnerAgreement,
  PartnerContact,
  PartnerOnboarding,
} from "@veritas/partner";

export interface PartnerResponse {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly contactEmail: string;
  readonly websiteUrl: string | null;
  readonly status: string;
  readonly tierId: string;
  readonly organizationId: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AgreementResponse {
  readonly id: string;
  readonly partnerId: string;
  readonly type: string;
  readonly status: string;
  readonly version: string;
  readonly contentHash: string;
  readonly signedByUserId: string | null;
  readonly signedAt: string | null;
  readonly effectiveAt: string | null;
  readonly expiresAt: string | null;
  readonly terminatedAt: string | null;
  readonly terminationReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ContactResponse {
  readonly id: string;
  readonly partnerId: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly role: string;
  readonly isPrimary: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OnboardingResponse {
  readonly id: string;
  readonly partnerId: string;
  readonly status: string;
  readonly currentStep: string;
  readonly completedSteps: readonly { readonly step: string; readonly completedAt: string; readonly notes?: string }[];
  readonly startedAt: string;
  readonly completedAt: string | null;
}

export function mapPartner(partner: Partner): PartnerResponse {
  return {
    id: partner.id,
    name: partner.name,
    slug: partner.slug,
    contactEmail: partner.contactEmail,
    websiteUrl: partner.websiteUrl,
    status: partner.status,
    tierId: partner.tierId,
    organizationId: partner.organizationId,
    metadata: partner.metadata,
    createdAt: partner.createdAt,
    updatedAt: partner.updatedAt,
  };
}

export function mapAgreement(agreement: PartnerAgreement): AgreementResponse {
  return {
    id: agreement.id,
    partnerId: agreement.partnerId,
    type: agreement.type,
    status: agreement.status,
    version: agreement.version,
    contentHash: agreement.contentHash,
    signedByUserId: agreement.signedByUserId,
    signedAt: agreement.signedAt,
    effectiveAt: agreement.effectiveAt,
    expiresAt: agreement.expiresAt,
    terminatedAt: agreement.terminatedAt,
    terminationReason: agreement.terminationReason,
    createdAt: agreement.createdAt,
    updatedAt: agreement.updatedAt,
  };
}

export function mapContact(contact: PartnerContact): ContactResponse {
  return {
    id: contact.id,
    partnerId: contact.partnerId,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    isPrimary: contact.isPrimary,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

export function mapOnboarding(onboarding: PartnerOnboarding): OnboardingResponse {
  return {
    id: onboarding.id,
    partnerId: onboarding.partnerId,
    status: onboarding.status,
    currentStep: onboarding.currentStep,
    completedSteps: onboarding.completedSteps.map((s) => ({
      step: s.step,
      completedAt: s.completedAt,
      ...(s.notes !== undefined ? { notes: s.notes } : {}),
    })),
    startedAt: onboarding.startedAt,
    completedAt: onboarding.completedAt,
  };
}
