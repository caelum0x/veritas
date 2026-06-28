// Extension registry — stores and retrieves registered extension metadata.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { ExtensionId, ExtensionMeta } from "./types.js";
import { ExtensionNotFoundError, ExtensionConflictError } from "./errors.js";

type ExtensionState = "active" | "disabled" | "error";

interface RegistryEntry {
  readonly meta: ExtensionMeta;
  state: ExtensionState;
}

/** In-memory store of all registered extensions with state management. */
export class ExtensionRegistry {
  readonly #entries: Map<ExtensionId, RegistryEntry> = new Map();

  /** Register an extension; fails if id already taken. */
  register(meta: ExtensionMeta): Result<void> {
    if (this.#entries.has(meta.id)) {
      return err(new ExtensionConflictError(meta.id));
    }
    this.#entries.set(meta.id, { meta, state: "active" });
    return ok(undefined);
  }

  /** Unregister an extension by id. */
  unregister(id: ExtensionId): Result<void> {
    if (!this.#entries.has(id)) {
      return err(new ExtensionNotFoundError(id));
    }
    this.#entries.delete(id);
    return ok(undefined);
  }

  /** Look up an extension by id. */
  get(id: ExtensionId): Result<RegistryEntry> {
    const entry = this.#entries.get(id);
    if (!entry) return err(new ExtensionNotFoundError(id));
    return ok(entry);
  }

  /** Set the lifecycle state of a registered extension. */
  setState(id: ExtensionId, state: ExtensionState): Result<void> {
    const entry = this.#entries.get(id);
    if (!entry) return err(new ExtensionNotFoundError(id));
    this.#entries.set(id, { ...entry, state });
    return ok(undefined);
  }

  /** Return all registered extension meta (immutable snapshot). */
  list(): readonly ExtensionMeta[] {
    return [...this.#entries.values()].map((e) => e.meta);
  }

  /** Return only the ids of active extensions. */
  activeIds(): readonly ExtensionId[] {
    return [...this.#entries.entries()]
      .filter(([, e]) => e.state === "active")
      .map(([id]) => id);
  }

  /** True if an extension with the given id is registered and active. */
  isActive(id: ExtensionId): boolean {
    const entry = this.#entries.get(id);
    return entry?.state === "active";
  }

  /** Total number of registered extensions. */
  get size(): number {
    return this.#entries.size;
  }
}
