// Scaling policy: defines rules that map signals to scaling actions.
import { z } from 'zod';
import { Brand, brand } from '@veritas/core';
import { SignalKindSchema } from './signal.js';

export type PolicyId = Brand<string, 'PolicyId'>;
export const policyId = (raw: string): PolicyId => brand<string, 'PolicyId'>(raw);

export const ScalingDirectionSchema = z.enum(['up', 'down', 'none']);
export type ScalingDirection = z.infer<typeof ScalingDirectionSchema>;

export const ThresholdConditionSchema = z.object({
  kind: z.literal('threshold'),
  signalKind: SignalKindSchema,
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  value: z.number().finite(),
  direction: ScalingDirectionSchema,
  stepPercent: z.number().min(1).max(100).default(25),
});
export type ThresholdCondition = z.infer<typeof ThresholdConditionSchema>;

export const TargetTrackingConditionSchema = z.object({
  kind: z.literal('target_tracking'),
  signalKind: SignalKindSchema,
  targetValue: z.number().finite().positive(),
  tolerance: z.number().min(0).max(1).default(0.1),
});
export type TargetTrackingCondition = z.infer<typeof TargetTrackingConditionSchema>;

export const PolicyConditionSchema = z.discriminatedUnion('kind', [
  ThresholdConditionSchema,
  TargetTrackingConditionSchema,
]);
export type PolicyCondition = z.infer<typeof PolicyConditionSchema>;

export const PolicySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  targetResource: z.string().min(1),
  conditions: z.array(PolicyConditionSchema).min(1),
  cooldownSeconds: z.number().int().positive().default(60),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
});
export type Policy = z.infer<typeof PolicySchema>;

export const CreatePolicySchema = PolicySchema.omit({ id: true });
export type CreatePolicy = z.infer<typeof CreatePolicySchema>;

export interface PolicyRepository {
  save(policy: Policy): Promise<void>;
  findById(id: string): Promise<Policy | null>;
  findByResource(resource: string): Promise<readonly Policy[]>;
  findAll(): Promise<readonly Policy[]>;
  delete(id: string): Promise<void>;
}

export class InMemoryPolicyRepository implements PolicyRepository {
  private readonly store = new Map<string, Policy>();

  async save(policy: Policy): Promise<void> {
    this.store.set(policy.id, policy);
  }

  async findById(id: string): Promise<Policy | null> {
    return this.store.get(id) ?? null;
  }

  async findByResource(resource: string): Promise<readonly Policy[]> {
    return Array.from(this.store.values()).filter(
      (p) => p.targetResource === resource,
    );
  }

  async findAll(): Promise<readonly Policy[]> {
    return Array.from(this.store.values());
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
