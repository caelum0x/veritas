// Retention lifecycle policies for stored objects
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { StorageError } from "./errors.js";

export type LifecycleAction = "delete" | "archive" | "transition";

export interface LifecycleRule {
  readonly id: string;
  readonly prefix: string;
  readonly action: LifecycleAction;
  /** Days after creation to apply the action */
  readonly daysAfterCreation: number;
  readonly enabled: boolean;
}

export interface LifecyclePolicy {
  readonly bucketOrPrefix: string;
  readonly rules: readonly LifecycleRule[];
}

export interface LifecycleManager {
  putPolicy(policy: LifecyclePolicy): Promise<Result<void, StorageError>>;
  getPolicy(bucketOrPrefix: string): Promise<Result<LifecyclePolicy | null, StorageError>>;
  deletePolicy(bucketOrPrefix: string): Promise<Result<void, StorageError>>;
  applyRules(key: string, createdAt: Date): Promise<Result<LifecycleAction | null, StorageError>>;
}

export class InMemoryLifecycleManager implements LifecycleManager {
  private readonly policies = new Map<string, LifecyclePolicy>();

  async putPolicy(policy: LifecyclePolicy): Promise<Result<void, StorageError>> {
    this.policies.set(policy.bucketOrPrefix, policy);
    return ok(undefined);
  }

  async getPolicy(bucketOrPrefix: string): Promise<Result<LifecyclePolicy | null, StorageError>> {
    return ok(this.policies.get(bucketOrPrefix) ?? null);
  }

  async deletePolicy(bucketOrPrefix: string): Promise<Result<void, StorageError>> {
    this.policies.delete(bucketOrPrefix);
    return ok(undefined);
  }

  async applyRules(key: string, createdAt: Date): Promise<Result<LifecycleAction | null, StorageError>> {
    const now = Date.now();
    const ageMs = now - createdAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    for (const policy of this.policies.values()) {
      for (const rule of policy.rules) {
        if (!rule.enabled) continue;
        if (!key.startsWith(rule.prefix)) continue;
        if (ageDays >= rule.daysAfterCreation) {
          return ok(rule.action);
        }
      }
    }
    return ok(null);
  }
}

export function makeLifecycleRule(
  id: string,
  prefix: string,
  action: LifecycleAction,
  daysAfterCreation: number,
  enabled = true,
): LifecycleRule {
  return { id, prefix, action, daysAfterCreation, enabled };
}
