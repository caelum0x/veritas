// In-memory FlagProvider implementation for testing and development

import type { FeatureFlag } from "./flag.js";
import type { FlagProvider } from "./provider.js";
import { ok, err, type Result, type AppError, NotFoundError } from "@veritas/core";

export class MemoryFlagProvider implements FlagProvider {
  private readonly flags: Map<string, FeatureFlag>;

  constructor(initialFlags: readonly FeatureFlag[] = []) {
    this.flags = new Map(initialFlags.map((f) => [f.key, f]));
  }

  async getFlag(key: string): Promise<Result<FeatureFlag, AppError>> {
    const flag = this.flags.get(key);
    if (flag === undefined) {
      return err(new NotFoundError({ message: `Feature flag not found: ${key}` }));
    }
    return ok(flag);
  }

  async listFlags(tags?: readonly string[]): Promise<Result<readonly FeatureFlag[], AppError>> {
    const all = Array.from(this.flags.values());
    if (tags === undefined || tags.length === 0) {
      return ok(all);
    }
    const filtered = all.filter(
      (f) => f.tags !== undefined && tags.some((t) => f.tags!.includes(t))
    );
    return ok(filtered);
  }

  async setFlag(flag: FeatureFlag): Promise<Result<void, AppError>> {
    this.flags.set(flag.key, flag);
    return ok(undefined);
  }

  async deleteFlag(key: string): Promise<Result<void, AppError>> {
    if (!this.flags.has(key)) {
      return err(new NotFoundError({ message: `Feature flag not found: ${key}` }));
    }
    this.flags.delete(key);
    return ok(undefined);
  }

  async hasFlag(key: string): Promise<boolean> {
    return this.flags.has(key);
  }
}
