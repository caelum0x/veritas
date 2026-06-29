// Domain events for the Organization aggregate.
import type { MembershipRole } from "@veritas/contracts";

export const ORGANIZATION_EVENT_TYPES = {
  ORGANIZATION_CREATED: "organization.created",
  ORGANIZATION_UPDATED: "organization.updated",
  ORGANIZATION_SUSPENDED: "organization.suspended",
  ORGANIZATION_REACTIVATED: "organization.reactivated",
  ORGANIZATION_DELETED: "organization.deleted",
  MEMBER_ADDED: "organization.member_added",
  MEMBER_REMOVED: "organization.member_removed",
  MEMBER_ROLE_CHANGED: "organization.member_role_changed",
  PLAN_CHANGED: "organization.plan_changed",
  API_KEY_ISSUED: "organization.api_key_issued",
  API_KEY_REVOKED: "organization.api_key_revoked",
} as const;

export type OrganizationEventType =
  (typeof ORGANIZATION_EVENT_TYPES)[keyof typeof ORGANIZATION_EVENT_TYPES];

export interface OrganizationCreatedPayload {
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly ownerId: string;
  readonly planId?: string;
  readonly metadata?: Record<string, string>;
}

export interface OrganizationUpdatedPayload {
  readonly organizationId: string;
  readonly name?: string;
  readonly metadata?: Record<string, string>;
}

export interface OrganizationSuspendedPayload {
  readonly organizationId: string;
  readonly reason: string;
}

export interface OrganizationReactivatedPayload {
  readonly organizationId: string;
}

export interface OrganizationDeletedPayload {
  readonly organizationId: string;
}

export interface MemberAddedPayload {
  readonly organizationId: string;
  readonly userId: string;
  readonly role: MembershipRole;
  readonly invitedBy?: string;
}

export interface MemberRemovedPayload {
  readonly organizationId: string;
  readonly userId: string;
  readonly removedBy?: string;
}

export interface MemberRoleChangedPayload {
  readonly organizationId: string;
  readonly userId: string;
  readonly previousRole: MembershipRole;
  readonly newRole: MembershipRole;
  readonly changedBy?: string;
}

export interface PlanChangedPayload {
  readonly organizationId: string;
  readonly previousPlanId: string | undefined;
  readonly newPlanId: string;
  readonly subscriptionId: string;
}

export interface ApiKeyIssuedPayload {
  readonly organizationId: string;
  readonly apiKeyId: string;
  readonly name: string;
  readonly issuedBy: string;
  readonly expiresAt?: string;
}

export interface ApiKeyRevokedPayload {
  readonly organizationId: string;
  readonly apiKeyId: string;
  readonly revokedBy?: string;
}

export type OrganizationEventPayload =
  | OrganizationCreatedPayload
  | OrganizationUpdatedPayload
  | OrganizationSuspendedPayload
  | OrganizationReactivatedPayload
  | OrganizationDeletedPayload
  | MemberAddedPayload
  | MemberRemovedPayload
  | MemberRoleChangedPayload
  | PlanChangedPayload
  | ApiKeyIssuedPayload
  | ApiKeyRevokedPayload;
