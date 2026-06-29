// Registry of mountable Express sub-apps, keyed by name.

import type { Logger } from "@veritas/observability";
import type { AppRegistryEntry, MountableApp } from "./types.js";
import { DuplicateAppNameError, AppNotFoundError } from "./errors.js";

/** Manages registration and resolution of named sub-applications. */
export class AppRegistry {
  private readonly entries = new Map<string, AppRegistryEntry>();

  /** Register a new app entry. Throws if the name is already registered. */
  register(entry: AppRegistryEntry): this {
    if (this.entries.has(entry.name)) {
      throw new DuplicateAppNameError(entry.name);
    }
    this.entries.set(entry.name, entry);
    return this;
  }

  /** Register multiple entries at once. */
  registerAll(entries: readonly AppRegistryEntry[]): this {
    for (const entry of entries) {
      this.register(entry);
    }
    return this;
  }

  /** Return all registered entries in insertion order. */
  list(): readonly AppRegistryEntry[] {
    return [...this.entries.values()];
  }

  /** Look up a single entry by name. Throws {@link AppNotFoundError} if absent. */
  get(name: string): AppRegistryEntry {
    const entry = this.entries.get(name);
    if (entry === undefined) {
      throw new AppNotFoundError(name);
    }
    return entry;
  }

  /** Check whether an entry with the given name exists. */
  has(name: string): boolean {
    return this.entries.has(name);
  }

  /** Remove an entry by name. Returns true if it existed. */
  remove(name: string): boolean {
    return this.entries.delete(name);
  }

  /** Return the number of registered entries. */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Materialise all registered entries into {@link MountableApp} instances by
   * invoking each entry's factory with the provided logger.
   */
  build(logger: Logger): readonly MountableApp[] {
    return [...this.entries.values()].map((entry) => ({
      name: entry.name,
      basePath: entry.basePath,
      router: entry.factory(logger),
    }));
  }

  /**
   * Materialise only the entries whose tags intersect with `filter`.
   * If `filter` is empty, all entries are returned.
   */
  buildByTags(tags: readonly string[], logger: Logger): readonly MountableApp[] {
    if (tags.length === 0) {
      return this.build(logger);
    }
    const tagSet = new Set(tags);
    return [...this.entries.values()]
      .filter((entry) => entry.tags?.some((t) => tagSet.has(t)) ?? false)
      .map((entry) => ({
        name: entry.name,
        basePath: entry.basePath,
        router: entry.factory(logger),
      }));
  }
}
