// Policy registry: in-memory store for retention policies, keyed by id and category.
import { ok, err, Result, newId } from "@veritas/core";
import {
  RetentionPolicy,
  CreateRetentionPolicy,
  RetentionCategory,
  makeRetentionPolicy,
  DEFAULT_POLICIES,
} from "./policy.js";
import { PolicyNotFoundError, PolicyConflictError } from "./errors.js";

export interface PolicyRegistry {
  /** Register a new retention policy. Returns conflict error if name already exists. */
  register(dto: CreateRetentionPolicy): Result<RetentionPolicy, PolicyConflictError>;
  /** Retrieve a policy by its id. */
  getById(id: string): Result<RetentionPolicy, PolicyNotFoundError>;
  /** Retrieve all enabled policies for a category. */
  getByCategory(category: RetentionCategory): ReadonlyArray<RetentionPolicy>;
  /** Return all registered policies. */
  listAll(): ReadonlyArray<RetentionPolicy>;
  /** Update an existing policy (immutable update). */
  update(
    id: string,
    patch: Partial<Omit<RetentionPolicy, "id" | "createdAt">>
  ): Result<RetentionPolicy, PolicyNotFoundError>;
  /** Remove a policy by id. */
  remove(id: string): Result<void, PolicyNotFoundError>;
}

/** Creates an in-memory PolicyRegistry seeded with the provided initial policies. */
export function createPolicyRegistry(
  initial: ReadonlyArray<CreateRetentionPolicy> = DEFAULT_POLICIES
): PolicyRegistry {
  const store = new Map<string, RetentionPolicy>();

  for (const dto of initial) {
    const policy = makeRetentionPolicy(dto);
    store.set(policy.id, policy);
  }

  const findByName = (name: string): RetentionPolicy | undefined => {
    for (const p of store.values()) {
      if (p.name === name) return p;
    }
    return undefined;
  };

  const register = (
    dto: CreateRetentionPolicy
  ): Result<RetentionPolicy, PolicyConflictError> => {
    if (findByName(dto.name) !== undefined) {
      return err(new PolicyConflictError(dto.name));
    }
    const policy = makeRetentionPolicy(dto);
    store.set(policy.id, policy);
    return ok(policy);
  };

  const getById = (
    id: string
  ): Result<RetentionPolicy, PolicyNotFoundError> => {
    const policy = store.get(id);
    return policy !== undefined
      ? ok(policy)
      : err(new PolicyNotFoundError(id));
  };

  const getByCategory = (
    category: RetentionCategory
  ): ReadonlyArray<RetentionPolicy> => {
    const results: RetentionPolicy[] = [];
    for (const p of store.values()) {
      if (p.category === category && p.enabled) {
        results.push(p);
      }
    }
    return results;
  };

  const listAll = (): ReadonlyArray<RetentionPolicy> =>
    Array.from(store.values());

  const update = (
    id: string,
    patch: Partial<Omit<RetentionPolicy, "id" | "createdAt">>
  ): Result<RetentionPolicy, PolicyNotFoundError> => {
    const existing = store.get(id);
    if (existing === undefined) {
      return err(new PolicyNotFoundError(id));
    }
    const updated: RetentionPolicy = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return ok(updated);
  };

  const remove = (id: string): Result<void, PolicyNotFoundError> => {
    if (!store.has(id)) {
      return err(new PolicyNotFoundError(id));
    }
    store.delete(id);
    return ok(undefined);
  };

  return { register, getById, getByCategory, listAll, update, remove };
}
