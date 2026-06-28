// Policy registry: stores and retrieves policies by id and tag.
import type { Result } from '@veritas/core';
import { ok, err } from '@veritas/core';
import type { Policy } from './policy.js';

export interface PolicyRegistry {
  register(policy: Policy): Result<void>;
  unregister(policyId: string): Result<void>;
  get(policyId: string): Result<Policy>;
  listAll(): ReadonlyArray<Policy>;
  findByTag(tag: string): ReadonlyArray<Policy>;
  findByResourceType(resourceType: string): ReadonlyArray<Policy>;
  has(policyId: string): boolean;
}

export function makeInMemoryPolicyRegistry(): PolicyRegistry {
  const store = new Map<string, Policy>();

  function register(policy: Policy): Result<void> {
    if (store.has(policy.id)) {
      return err(new Error(`Policy already registered: ${policy.id}`));
    }
    store.set(policy.id, policy);
    return ok(undefined);
  }

  function unregister(policyId: string): Result<void> {
    if (!store.has(policyId)) {
      return err(new Error(`Policy not found: ${policyId}`));
    }
    store.delete(policyId);
    return ok(undefined);
  }

  function get(policyId: string): Result<Policy> {
    const policy = store.get(policyId);
    if (policy === undefined) {
      return err(new Error(`Policy not found: ${policyId}`));
    }
    return ok(policy);
  }

  function listAll(): ReadonlyArray<Policy> {
    return Array.from(store.values());
  }

  function findByTag(tag: string): ReadonlyArray<Policy> {
    return Array.from(store.values()).filter((p) => p.tags.includes(tag));
  }

  function findByResourceType(_resourceType: string): ReadonlyArray<Policy> {
    // Policy does not carry a resourceType field; return all policies.
    return Array.from(store.values());
  }

  function has(policyId: string): boolean {
    return store.has(policyId);
  }

  return { register, unregister, get, listAll, findByTag, findByResourceType, has };
}
