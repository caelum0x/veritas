// Organization aggregate root managing membership and plan lifecycle.
import { AggregateRoot } from "../aggregate-root.js";
import type { StoredEvent } from "../domain-event.js";
import { ORGANIZATION_EVENT_TYPES } from "./organization.events.js";
import type {
  OrganizationCreatedPayload,
  OrganizationUpdatedPayload,
  OrganizationSuspendedPayload,
  MemberAddedPayload,
  MemberRemovedPayload,
  MemberRoleChangedPayload,
  PlanChangedPayload,
  ApiKeyIssuedPayload,
  ApiKeyRevokedPayload,
} from "./organization.events.js";
import type { MembershipRole } from "@veritas/contracts";

export type OrganizationStatus = "active" | "suspended" | "deleted";

export interface MemberEntry {
  readonly userId: string;
  readonly role: MembershipRole;
}

export interface ApiKeyEntry {
  readonly apiKeyId: string;
  readonly name: string;
  readonly issuedBy: string;
  readonly issuedAt: string;
  readonly expiresAt?: string;
}

export class OrganizationAggregate extends AggregateRoot {
  readonly aggregateType = "Organization";

  private _organizationId: string = "";
  private _name: string = "";
  private _slug: string = "";
  private _ownerId: string = "";
  private _planId: string | undefined;
  private _subscriptionId: string | undefined;
  private _status: OrganizationStatus = "active";
  private _members: readonly MemberEntry[] = [];
  private _apiKeys: readonly ApiKeyEntry[] = [];
  private _metadata: Record<string, string> = {};

  get id(): string {
    return this._organizationId;
  }

  get name(): string {
    return this._name;
  }

  get slug(): string {
    return this._slug;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  get planId(): string | undefined {
    return this._planId;
  }

  get subscriptionId(): string | undefined {
    return this._subscriptionId;
  }

  get status(): OrganizationStatus {
    return this._status;
  }

  get members(): readonly MemberEntry[] {
    return this._members;
  }

  get apiKeys(): readonly ApiKeyEntry[] {
    return this._apiKeys;
  }

  get metadata(): Readonly<Record<string, string>> {
    return this._metadata;
  }

  static create(
    payload: Omit<OrganizationCreatedPayload, never>
  ): OrganizationAggregate {
    const agg = new OrganizationAggregate();
    agg.raise(ORGANIZATION_EVENT_TYPES.ORGANIZATION_CREATED, payload);
    return agg;
  }

  update(
    payload: Omit<OrganizationUpdatedPayload, "organizationId">
  ): void {
    if (this._status === "deleted") throw new Error("Organization is deleted");
    this.raise(ORGANIZATION_EVENT_TYPES.ORGANIZATION_UPDATED, {
      organizationId: this._organizationId,
      ...payload,
    });
  }

  suspend(reason: string): void {
    if (this._status === "deleted") throw new Error("Organization is deleted");
    if (this._status === "suspended") return;
    this.raise(ORGANIZATION_EVENT_TYPES.ORGANIZATION_SUSPENDED, {
      organizationId: this._organizationId,
      reason,
    });
  }

  reactivate(): void {
    if (this._status === "deleted") throw new Error("Organization is deleted");
    if (this._status === "active") return;
    this.raise(ORGANIZATION_EVENT_TYPES.ORGANIZATION_REACTIVATED, {
      organizationId: this._organizationId,
    });
  }

  delete(): void {
    if (this._status === "deleted") return;
    this.raise(ORGANIZATION_EVENT_TYPES.ORGANIZATION_DELETED, {
      organizationId: this._organizationId,
    });
  }

  addMember(userId: string, role: MembershipRole, invitedBy?: string): void {
    if (this._status === "deleted") throw new Error("Organization is deleted");
    const existing = this._members.find((m) => m.userId === userId);
    if (existing) throw new Error(`User ${userId} is already a member`);
    this.raise(ORGANIZATION_EVENT_TYPES.MEMBER_ADDED, {
      organizationId: this._organizationId,
      userId,
      role,
      invitedBy,
    });
  }

  removeMember(userId: string, removedBy?: string): void {
    if (this._status === "deleted") throw new Error("Organization is deleted");
    const existing = this._members.find((m) => m.userId === userId);
    if (!existing) throw new Error(`User ${userId} is not a member`);
    this.raise(ORGANIZATION_EVENT_TYPES.MEMBER_REMOVED, {
      organizationId: this._organizationId,
      userId,
      removedBy,
    });
  }

  changeMemberRole(
    userId: string,
    newRole: MembershipRole,
    changedBy?: string
  ): void {
    if (this._status === "deleted") throw new Error("Organization is deleted");
    const existing = this._members.find((m) => m.userId === userId);
    if (!existing) throw new Error(`User ${userId} is not a member`);
    this.raise(ORGANIZATION_EVENT_TYPES.MEMBER_ROLE_CHANGED, {
      organizationId: this._organizationId,
      userId,
      previousRole: existing.role,
      newRole,
      changedBy,
    });
  }

  changePlan(newPlanId: string, subscriptionId: string): void {
    if (this._status === "deleted") throw new Error("Organization is deleted");
    this.raise(ORGANIZATION_EVENT_TYPES.PLAN_CHANGED, {
      organizationId: this._organizationId,
      previousPlanId: this._planId,
      newPlanId,
      subscriptionId,
    });
  }

  issueApiKey(
    apiKeyId: string,
    name: string,
    issuedBy: string,
    expiresAt?: string
  ): void {
    if (this._status === "deleted") throw new Error("Organization is deleted");
    this.raise(ORGANIZATION_EVENT_TYPES.API_KEY_ISSUED, {
      organizationId: this._organizationId,
      apiKeyId,
      name,
      issuedBy,
      expiresAt,
    });
  }

  revokeApiKey(apiKeyId: string, revokedBy?: string): void {
    if (this._status === "deleted") throw new Error("Organization is deleted");
    const key = this._apiKeys.find((k) => k.apiKeyId === apiKeyId);
    if (!key) throw new Error(`API key ${apiKeyId} not found`);
    this.raise(ORGANIZATION_EVENT_TYPES.API_KEY_REVOKED, {
      organizationId: this._organizationId,
      apiKeyId,
      revokedBy,
    });
  }

  apply(event: StoredEvent): void {
    switch (event.eventType) {
      case ORGANIZATION_EVENT_TYPES.ORGANIZATION_CREATED: {
        const p = event.payload as OrganizationCreatedPayload;
        this._organizationId = p.organizationId;
        this._name = p.name;
        this._slug = p.slug;
        this._ownerId = p.ownerId;
        this._planId = p.planId;
        this._status = "active";
        this._metadata = { ...(p.metadata ?? {}) };
        this._members = [{ userId: p.ownerId, role: "owner" as MembershipRole }];
        break;
      }
      case ORGANIZATION_EVENT_TYPES.ORGANIZATION_UPDATED: {
        const p = event.payload as OrganizationUpdatedPayload;
        if (p.name !== undefined) this._name = p.name;
        if (p.metadata !== undefined)
          this._metadata = { ...this._metadata, ...p.metadata };
        break;
      }
      case ORGANIZATION_EVENT_TYPES.ORGANIZATION_SUSPENDED: {
        this._status = "suspended";
        break;
      }
      case ORGANIZATION_EVENT_TYPES.ORGANIZATION_REACTIVATED: {
        this._status = "active";
        break;
      }
      case ORGANIZATION_EVENT_TYPES.ORGANIZATION_DELETED: {
        this._status = "deleted";
        break;
      }
      case ORGANIZATION_EVENT_TYPES.MEMBER_ADDED: {
        const p = event.payload as MemberAddedPayload;
        this._members = [
          ...this._members,
          { userId: p.userId, role: p.role },
        ];
        break;
      }
      case ORGANIZATION_EVENT_TYPES.MEMBER_REMOVED: {
        const p = event.payload as MemberRemovedPayload;
        this._members = this._members.filter((m) => m.userId !== p.userId);
        break;
      }
      case ORGANIZATION_EVENT_TYPES.MEMBER_ROLE_CHANGED: {
        const p = event.payload as MemberRoleChangedPayload;
        this._members = this._members.map((m) =>
          m.userId === p.userId ? { ...m, role: p.newRole } : m
        );
        break;
      }
      case ORGANIZATION_EVENT_TYPES.PLAN_CHANGED: {
        const p = event.payload as PlanChangedPayload;
        this._planId = p.newPlanId;
        this._subscriptionId = p.subscriptionId;
        break;
      }
      case ORGANIZATION_EVENT_TYPES.API_KEY_ISSUED: {
        const p = event.payload as ApiKeyIssuedPayload;
        const entry: ApiKeyEntry = {
          apiKeyId: p.apiKeyId,
          name: p.name,
          issuedBy: p.issuedBy,
          issuedAt: event.occurredAt,
          expiresAt: p.expiresAt,
        };
        this._apiKeys = [...this._apiKeys, entry];
        break;
      }
      case ORGANIZATION_EVENT_TYPES.API_KEY_REVOKED: {
        const p = event.payload as ApiKeyRevokedPayload;
        this._apiKeys = this._apiKeys.filter(
          (k) => k.apiKeyId !== p.apiKeyId
        );
        break;
      }
    }
  }
}
