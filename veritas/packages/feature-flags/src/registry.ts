// Central registry of known feature flags keyed by their string key
import { type FeatureFlag } from "./flag.js";
import { ConflictError, NotFoundError } from "@veritas/core";

/** In-memory registry for FeatureFlag definitions */
export class FlagRegistry {
  private readonly flags = new Map<string, FeatureFlag>();

  /** Register a flag; throws ConflictError if already registered */
  register(flag: FeatureFlag): void {
    if (this.flags.has(flag.key)) {
      throw new ConflictError({
        message: `Flag already registered: ${flag.key}`,
        details: { flagKey: flag.key },
      });
    }
    this.flags.set(flag.key, flag);
  }

  /** Register or replace a flag unconditionally */
  upsert(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
  }

  /** Retrieve a flag by key; throws NotFoundError if absent */
  get(key: string): FeatureFlag {
    const flag = this.flags.get(key);
    if (!flag) {
      throw new NotFoundError({
        message: `Flag not found: ${key}`,
        details: { flagKey: key },
      });
    }
    return flag;
  }

  /** Returns undefined instead of throwing when flag is absent */
  find(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /** Remove a flag from the registry */
  remove(key: string): void {
    this.flags.delete(key);
  }

  /** All registered flags */
  list(): readonly FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /** Number of registered flags */
  get size(): number {
    return this.flags.size;
  }
}

/** Global default registry singleton */
export const defaultRegistry = new FlagRegistry();
