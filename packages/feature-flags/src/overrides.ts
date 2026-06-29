// Per-tenant flag overrides stored in memory with optional persistence
import { type EvaluationContext } from "./context.js";

/** A single tenant-level override entry */
export interface TenantOverride {
  readonly tenantId: string;
  readonly flagKey: string;
  /** When true the flag is forced on; when false it is forced off */
  readonly enabled: boolean;
}

/** Mutable store for per-tenant overrides */
export class OverrideStore {
  private readonly overrides = new Map<string, boolean>();

  private buildKey(tenantId: string, flagKey: string): string {
    return `${tenantId}::${flagKey}`;
  }

  /** Set an override for a specific tenant+flag combination */
  set(tenantId: string, flagKey: string, enabled: boolean): void {
    this.overrides.set(this.buildKey(tenantId, flagKey), enabled);
  }

  /** Remove an override so normal evaluation resumes */
  remove(tenantId: string, flagKey: string): void {
    this.overrides.delete(this.buildKey(tenantId, flagKey));
  }

  /** Resolve override for a context, returns undefined when no override exists */
  resolve(context: EvaluationContext, flagKey: string): boolean | undefined {
    if (!context.tenantId) return undefined;
    const key = this.buildKey(context.tenantId, flagKey);
    return this.overrides.get(key);
  }

  /** List all current overrides */
  list(): readonly TenantOverride[] {
    return Array.from(this.overrides.entries()).map(([k, enabled]) => {
      const [tenantId, flagKey] = k.split("::");
      return { tenantId: tenantId ?? "", flagKey: flagKey ?? "", enabled };
    });
  }

  /** Clear all overrides */
  clear(): void {
    this.overrides.clear();
  }
}
