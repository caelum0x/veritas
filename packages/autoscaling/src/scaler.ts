// Scaler: orchestrates signal ingestion, policy evaluation, and replica adjustment.
import { Result, ok, err, AppError, Clock, systemClock, newId, IsoTimestamp } from '@veritas/core';
import { Signal, SignalRepository, InMemorySignalRepository } from './signal.js';
import { Policy, PolicyRepository, InMemoryPolicyRepository } from './policy.js';
import { CooldownManager, InMemoryCooldownStore } from './cooldown.js';
import { assessMetricTarget, computeDesiredReplicas } from './metric-target.js';
import { ScaleDecision, makeScaleDecision, noopDecision as makeNoopDecision } from './decision.js';
import { CapacityLimits, clampCapacity } from './limits.js';

export interface ResourceState {
  readonly resource: string;
  readonly currentReplicas: number;
  readonly limits: CapacityLimits;
}

export interface ResourceStateProvider {
  get(resource: string): Promise<ResourceState | null>;
  update(resource: string, replicas: number): Promise<void>;
}

export class InMemoryResourceStateProvider implements ResourceStateProvider {
  private readonly store = new Map<string, ResourceState>();

  register(state: ResourceState): void {
    this.store.set(state.resource, state);
  }

  async get(resource: string): Promise<ResourceState | null> {
    return this.store.get(resource) ?? null;
  }

  async update(resource: string, replicas: number): Promise<void> {
    const existing = this.store.get(resource);
    if (existing === undefined) return;
    this.store.set(resource, { ...existing, currentReplicas: replicas });
  }
}

export interface ScalerOptions {
  signals?: SignalRepository;
  policies?: PolicyRepository;
  resources?: ResourceStateProvider;
  cooldown?: CooldownManager;
  clock?: Clock;
}

export interface EvaluationResult {
  readonly resource: string;
  readonly decision: ScaleDecision;
  readonly policyId: string | null;
}

export class Scaler {
  private readonly signals: SignalRepository;
  private readonly policies: PolicyRepository;
  private readonly resources: ResourceStateProvider;
  private readonly cooldown: CooldownManager;
  private readonly clock: Clock;

  constructor(opts: ScalerOptions = {}) {
    this.signals = opts.signals ?? new InMemorySignalRepository();
    this.policies = opts.policies ?? new InMemoryPolicyRepository();
    this.resources = opts.resources ?? new InMemoryResourceStateProvider();
    const cooldownStore = new InMemoryCooldownStore();
    this.cooldown = opts.cooldown ?? new CooldownManager(cooldownStore, opts.clock ?? systemClock);
    this.clock = opts.clock ?? systemClock;
  }

  async ingestSignal(signal: Signal): Promise<Result<void>> {
    await this.signals.save(signal);
    return ok(undefined);
  }

  async evaluate(resource: string): Promise<Result<EvaluationResult>> {
    const state = await this.resources.get(resource);
    if (state === null) {
      return err(new AppError("NOT_FOUND", 404, `Resource not found: ${resource}`));
    }

    const activePolicies = (await this.policies.findByResource(resource))
      .filter((p) => p.enabled)
      .sort((a, b) => b.priority - a.priority);

    const ts = new Date(this.clock.now()).toISOString();

    if (activePolicies.length === 0) {
      return ok({
        resource,
        decision: makeNoopDecision(state.currentReplicas, 'No policies configured', ts),
        policyId: null,
      });
    }

    for (const policy of activePolicies) {
      const result = await this.applyPolicy(policy, state, ts);
      if (result !== null && result.decision.direction !== 'NONE') {
        return ok(result);
      }
    }

    return ok({
      resource,
      decision: makeNoopDecision(state.currentReplicas, 'No scaling required', ts),
      policyId: null,
    });
  }

  async applyDecision(
    resource: string,
    evaluation: EvaluationResult,
  ): Promise<Result<void>> {
    if (evaluation.decision.direction === 'NONE') return ok(undefined);

    const direction = evaluation.decision.direction === 'UP' ? 'up' : 'down';
    const active = await this.cooldown.isActive(resource, direction);
    if (active) return ok(undefined);

    const state = await this.resources.get(resource);
    if (state === null) return ok(undefined);

    await this.resources.update(resource, evaluation.decision.desiredCapacity);

    const policy = evaluation.policyId !== null
      ? await this.policies.findById(evaluation.policyId)
      : null;
    const cooldownSeconds = policy?.cooldownSeconds ?? 60;
    await this.cooldown.record(resource, direction, cooldownSeconds);

    return ok(undefined);
  }

  getSignalRepository(): SignalRepository {
    return this.signals;
  }

  getPolicyRepository(): PolicyRepository {
    return this.policies;
  }

  getResourceStateProvider(): ResourceStateProvider {
    return this.resources;
  }

  private async applyPolicy(
    policy: Policy,
    state: ResourceState,
    ts: string,
  ): Promise<EvaluationResult | null> {
    for (const condition of policy.conditions) {
      if (condition.kind === 'threshold') {
        const signal = await this.signals.findLatest(condition.signalKind, state.resource);
        if (signal === null) continue;

        const triggered = this.evaluateThreshold(signal.value, condition.operator, condition.value);
        if (!triggered) continue;

        if (condition.direction === 'none') {
          return {
            resource: state.resource,
            decision: makeNoopDecision(state.currentReplicas, 'Threshold met but direction=none', ts),
            policyId: policy.id,
          };
        }

        const stepFraction = condition.stepPercent / 100;
        const delta = Math.max(1, Math.round(state.currentReplicas * stepFraction));
        const rawDesired = condition.direction === 'up'
          ? state.currentReplicas + delta
          : state.currentReplicas - delta;

        const clamped = this.clamp(rawDesired, state.limits);
        const reason = `Threshold: ${condition.signalKind} ${condition.operator} ${condition.value}`;
        return {
          resource: state.resource,
          decision: makeScaleDecision(state.currentReplicas, clamped, reason, {
            triggeredByPolicy: policy.id,
            timestamp: ts,
          }),
          policyId: policy.id,
        };
      }

      if (condition.kind === 'target_tracking') {
        const signal = await this.signals.findLatest(condition.signalKind, state.resource);
        if (signal === null) continue;

        const assessment = assessMetricTarget(
          {
            signalKind: condition.signalKind,
            targetValue: condition.targetValue,
            tolerance: condition.tolerance,
            resource: state.resource,
          },
          signal.value,
        );

        if (assessment.action === 'none') continue;

        const rawDesired = computeDesiredReplicas(
          state.currentReplicas,
          signal.value,
          condition.targetValue,
        );
        const clamped = this.clamp(rawDesired, state.limits);
        const reason = `Target tracking: ${condition.signalKind} target=${condition.targetValue} actual=${signal.value}`;
        return {
          resource: state.resource,
          decision: makeScaleDecision(state.currentReplicas, clamped, reason, {
            triggeredByPolicy: policy.id,
            timestamp: ts,
          }),
          policyId: policy.id,
        };
      }
    }

    return null;
  }

  private evaluateThreshold(
    value: number,
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
    threshold: number,
  ): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
    }
  }

  private clamp(desired: number, limits: CapacityLimits): number {
    const result = clampCapacity(desired, limits);
    if (result.ok) return result.value;
    return limits.min;
  }
}
