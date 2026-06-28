// RetentionService: orchestrates policy CRUD, legal hold lifecycle, and record expiry evaluation via @veritas/retention.

import {
  makeLegalHold,
  releaseLegalHold,
  isUnderLegalHold,
  evaluateRecords,
  createRetentionAuditLog,
  type LegalHold,
  type RetentionPolicy,
  type ExpiryEvaluation,
  type RecordRef,
  type RetentionCategory,
  type CreateRetentionPolicy,
} from "@veritas/retention";
import { err, ok, type Result } from "@veritas/core";
import type { Deps } from "../../container.js";
import type {
  CreatePolicyBody,
  UpdatePolicyBody,
  CreateLegalHoldBody,
} from "./retention.schema.js";

export class RetentionService {
  private readonly holds: LegalHold[] = [];
  private readonly auditLog = createRetentionAuditLog();

  constructor(private readonly deps: Deps) {}

  listPolicies(category?: RetentionCategory): ReadonlyArray<RetentionPolicy> {
    if (category !== undefined) {
      return this.deps.policyRegistry.getByCategory(category);
    }
    return this.deps.policyRegistry.listAll();
  }

  getPolicy(id: string): Result<RetentionPolicy> {
    const result = this.deps.policyRegistry.getById(id);
    if (!result.ok) return err(result.error);
    return ok(result.value);
  }

  createPolicy(body: CreatePolicyBody): Result<RetentionPolicy> {
    const dto: CreateRetentionPolicy = {
      name: body.name,
      description: body.description,
      category: body.category,
      retentionDays: body.retentionDays,
      action: body.action,
      legalHoldEligible: body.legalHoldEligible,
      enabled: body.enabled,
    };
    const result = this.deps.policyRegistry.register(dto);
    if (!result.ok) return err(result.error);

    this.auditLog.append({
      eventType: "policy_created",
      actor: "api",
      policyId: result.value.id,
      note: `Policy '${result.value.name}' created`,
      details: {},
      recordId: null,
      category: null,
      holdId: null,
      action: null,
    });

    return ok(result.value);
  }

  updatePolicy(id: string, body: UpdatePolicyBody): Result<RetentionPolicy> {
    const patch: Partial<Omit<RetentionPolicy, "id" | "createdAt">> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description;
    if (body.retentionDays !== undefined) patch.retentionDays = body.retentionDays;
    if (body.action !== undefined) patch.action = body.action;
    if (body.legalHoldEligible !== undefined) patch.legalHoldEligible = body.legalHoldEligible;
    if (body.enabled !== undefined) patch.enabled = body.enabled;

    const result = this.deps.policyRegistry.update(id, patch);
    if (!result.ok) return err(result.error);

    this.auditLog.append({
      eventType: "policy_updated",
      actor: "api",
      policyId: id,
      note: `Policy '${id}' updated`,
      details: patch as Record<string, unknown>,
      recordId: null,
      category: null,
      holdId: null,
      action: null,
    });

    return ok(result.value);
  }

  deletePolicy(id: string): Result<void> {
    const result = this.deps.policyRegistry.remove(id);
    if (!result.ok) return err(result.error);

    this.auditLog.append({
      eventType: "policy_deleted",
      actor: "api",
      policyId: id,
      note: `Policy '${id}' deleted`,
      details: {},
      recordId: null,
      category: null,
      holdId: null,
      action: null,
    });

    return ok(undefined);
  }

  listLegalHolds(statusFilter?: string): ReadonlyArray<LegalHold> {
    if (statusFilter === undefined) return [...this.holds];
    return this.holds.filter((h) => h.status === statusFilter);
  }

  getLegalHold(id: string): Result<LegalHold> {
    const hold = this.holds.find((h) => h.id === id);
    if (hold === undefined) {
      return err(new Error(`Legal hold not found: ${id}`));
    }
    return ok(hold);
  }

  createLegalHold(body: CreateLegalHoldBody): LegalHold {
    const hold = makeLegalHold({
      reason: body.reason,
      placedBy: body.placedBy,
      categories: body.categories,
      recordIds: body.recordIds,
      expiresAt: body.expiresAt ?? null,
    });
    this.holds.push(hold);

    this.auditLog.append({
      eventType: "hold_placed",
      actor: body.placedBy,
      holdId: hold.id,
      note: `Legal hold placed: ${body.reason}`,
      details: { categories: body.categories },
      recordId: null,
      category: null,
      policyId: null,
      action: null,
    });

    return hold;
  }

  releaseLegalHold(id: string): Result<LegalHold> {
    const idx = this.holds.findIndex((h) => h.id === id);
    if (idx === -1) {
      return err(new Error(`Legal hold not found: ${id}`));
    }
    const existing = this.holds[idx];
    if (existing === undefined) {
      return err(new Error(`Legal hold not found: ${id}`));
    }
    const released = releaseLegalHold(existing);
    this.holds[idx] = released;

    this.auditLog.append({
      eventType: "hold_released",
      actor: "api",
      holdId: id,
      note: `Legal hold released`,
      details: {},
      recordId: null,
      category: null,
      policyId: null,
      action: null,
    });

    return ok(released);
  }

  evaluateRecords(records: ReadonlyArray<RecordRef>): ReadonlyArray<ExpiryEvaluation> {
    const now = this.deps.clock.now().toISOString();
    const policies = this.deps.policyRegistry.listAll();
    const activeHolds = this.holds.filter((h) => h.status === "active");

    const policyResolver = (category: string): RetentionPolicy | null => {
      const match = policies.find((p) => p.enabled && p.category === category);
      return match ?? null;
    };

    return evaluateRecords(records, policyResolver, activeHolds, now);
  }

  checkRecordHold(recordId: string, category: string): boolean {
    const now = this.deps.clock.now().toISOString();
    return isUnderLegalHold(this.holds, category, recordId, now);
  }

  getAuditLog() {
    return this.auditLog.listAll();
  }
}
