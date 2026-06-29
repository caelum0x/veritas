// In-memory registry that stores and retrieves health check registrations by name.
import type { HealthCheck } from "./health-check.js";
import type { HealthCheckRegistration } from "./types.js";
import { DuplicateHealthCheckError, UnknownHealthCheckError } from "./errors.js";

/** Port: manages the lifecycle of registered health checks. */
export interface HealthRegistry {
  register(check: HealthCheck, opts?: RegistrationOptions): void;
  unregister(name: string): void;
  get(name: string): HealthCheck;
  list(): readonly HealthCheckRegistration[];
  has(name: string): boolean;
  clear(): void;
}

export interface RegistrationOptions {
  readonly critical?: boolean;
  readonly tags?: readonly string[];
}

interface Entry {
  readonly check: HealthCheck;
  readonly registration: HealthCheckRegistration;
}

/** Creates a new in-memory health registry. */
export function createHealthRegistry(): HealthRegistry {
  const entries = new Map<string, Entry>();

  return {
    register(check: HealthCheck, opts: RegistrationOptions = {}): void {
      if (entries.has(check.name)) {
        throw new DuplicateHealthCheckError(check.name);
      }
      const registration: HealthCheckRegistration = {
        name: check.name,
        critical: opts.critical ?? false,
        tags: opts.tags ?? [],
        registeredAt: new Date().toISOString(),
      };
      entries.set(check.name, { check, registration });
    },

    unregister(name: string): void {
      if (!entries.has(name)) {
        throw new UnknownHealthCheckError(name);
      }
      entries.delete(name);
    },

    get(name: string): HealthCheck {
      const entry = entries.get(name);
      if (entry === undefined) {
        throw new UnknownHealthCheckError(name);
      }
      return entry.check;
    },

    list(): readonly HealthCheckRegistration[] {
      return Array.from(entries.values()).map((e) => e.registration);
    },

    has(name: string): boolean {
      return entries.has(name);
    },

    clear(): void {
      entries.clear();
    },
  };
}
