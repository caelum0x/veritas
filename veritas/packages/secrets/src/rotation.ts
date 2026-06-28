// Defines rotation policies and orchestrates automatic secret rotation.
import { z } from "zod";
import { ok, err, Result } from "@veritas/core";
import { SecretsManager } from "./manager.js";
import { SecretRotationError } from "./errors.js";

export const RotationIntervalSchema = z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]);
export type RotationInterval = z.infer<typeof RotationIntervalSchema>;

export const RotationPolicySchema = z.object({
  secretName: z.string().min(1),
  interval: RotationIntervalSchema,
  enabled: z.boolean().default(true),
  lastRotatedAt: z.string().datetime().optional(),
  nextRotationAt: z.string().datetime().optional(),
  onRotate: z.string().optional(), // webhook URL or handler key
});

export type RotationPolicy = z.infer<typeof RotationPolicySchema>;

const INTERVAL_MS: Record<RotationInterval, number> = {
  daily: 86_400_000,
  weekly: 604_800_000,
  monthly: 2_592_000_000,
  quarterly: 7_776_000_000,
  yearly: 31_536_000_000,
};

export function computeNextRotation(interval: RotationInterval, from?: string): string {
  const base = from ? new Date(from).getTime() : Date.now();
  return new Date(base + INTERVAL_MS[interval]).toISOString();
}

export function isDueForRotation(policy: RotationPolicy, now = new Date()): boolean {
  if (!policy.enabled) return false;
  if (!policy.nextRotationAt) return true;
  return now >= new Date(policy.nextRotationAt);
}

export interface RotationValueGenerator {
  generate(secretName: string): Promise<string>;
}

export class RandomRotationGenerator implements RotationValueGenerator {
  private readonly length: number;
  constructor(length = 32) {
    this.length = length;
  }
  async generate(_secretName: string): Promise<string> {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let result = "";
    for (let i = 0; i < this.length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
}

export class RotationOrchestrator {
  private readonly policies = new Map<string, RotationPolicy>();

  constructor(
    private readonly manager: SecretsManager,
    private readonly generator: RotationValueGenerator = new RandomRotationGenerator()
  ) {}

  registerPolicy(policy: RotationPolicy): void {
    this.policies.set(policy.secretName, RotationPolicySchema.parse(policy));
  }

  removePolicy(secretName: string): void {
    this.policies.delete(secretName);
  }

  getPolicy(secretName: string): RotationPolicy | undefined {
    return this.policies.get(secretName);
  }

  listPolicies(): ReadonlyArray<RotationPolicy> {
    return [...this.policies.values()];
  }

  async rotateDueSecrets(): Promise<ReadonlyArray<Result<string, SecretRotationError>>> {
    const now = new Date();
    const due = [...this.policies.values()].filter((p) => isDueForRotation(p, now));
    return Promise.all(due.map((p) => this.rotateSecret(p.secretName)));
  }

  async rotateSecret(secretName: string): Promise<Result<string, SecretRotationError>> {
    try {
      const newValue = await this.generator.generate(secretName);
      const result = await this.manager.setSecret(secretName, newValue, {
        rotationEnabled: true,
      });
      if (result.ok === false) {
        return err(new SecretRotationError(secretName, result.error));
      }
      const now = new Date().toISOString();
      const existing = this.policies.get(secretName);
      if (existing) {
        const updated: RotationPolicy = {
          ...existing,
          lastRotatedAt: now,
          nextRotationAt: computeNextRotation(existing.interval, now),
        };
        this.policies.set(secretName, updated);
      }
      return ok(result.value.version);
    } catch (cause) {
      return err(new SecretRotationError(secretName, cause));
    }
  }
}
