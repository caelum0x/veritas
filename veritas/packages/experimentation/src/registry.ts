// In-memory experiment registry — CRUD for Experiment, Variant, and Metric definitions
import { ConflictError, NotFoundError } from "@veritas/core";
import type { Experiment, Variant, ExperimentMetric, Guardrail } from "./types.js";

/** Port interface so a persistent store can be substituted */
export interface ExperimentStore {
  getExperiment(id: string): Experiment | undefined;
  getExperimentByKey(key: string): Experiment | undefined;
  listExperiments(): readonly Experiment[];
  putExperiment(experiment: Experiment): void;
  deleteExperiment(id: string): void;

  getVariant(id: string): Variant | undefined;
  listVariants(experimentId: string): readonly Variant[];
  putVariant(variant: Variant): void;
  deleteVariant(id: string): void;

  getMetric(id: string): ExperimentMetric | undefined;
  listMetrics(experimentId: string): readonly ExperimentMetric[];
  putMetric(metric: ExperimentMetric): void;
  deleteMetric(id: string): void;

  getGuardrail(id: string): Guardrail | undefined;
  listGuardrails(experimentId: string): readonly Guardrail[];
  putGuardrail(guardrail: Guardrail): void;
  deleteGuardrail(id: string): void;
}

/** Default in-memory implementation of ExperimentStore */
export class InMemoryExperimentStore implements ExperimentStore {
  private readonly experiments = new Map<string, Experiment>();
  private readonly experimentsByKey = new Map<string, Experiment>();
  private readonly variants = new Map<string, Variant>();
  private readonly metrics = new Map<string, ExperimentMetric>();
  private readonly guardrails = new Map<string, Guardrail>();

  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  getExperimentByKey(key: string): Experiment | undefined {
    return this.experimentsByKey.get(key);
  }

  listExperiments(): readonly Experiment[] {
    return Array.from(this.experiments.values());
  }

  putExperiment(experiment: Experiment): void {
    const existing = this.experiments.get(experiment.id);
    if (existing && existing.key !== experiment.key) {
      this.experimentsByKey.delete(existing.key);
    }
    this.experiments.set(experiment.id, experiment);
    this.experimentsByKey.set(experiment.key, experiment);
  }

  deleteExperiment(id: string): void {
    const exp = this.experiments.get(id);
    if (exp) this.experimentsByKey.delete(exp.key);
    this.experiments.delete(id);
  }

  getVariant(id: string): Variant | undefined {
    return this.variants.get(id);
  }

  listVariants(experimentId: string): readonly Variant[] {
    return Array.from(this.variants.values()).filter(
      (v) => v.experimentId === experimentId
    );
  }

  putVariant(variant: Variant): void {
    this.variants.set(variant.id, variant);
  }

  deleteVariant(id: string): void {
    this.variants.delete(id);
  }

  getMetric(id: string): ExperimentMetric | undefined {
    return this.metrics.get(id);
  }

  listMetrics(experimentId: string): readonly ExperimentMetric[] {
    return Array.from(this.metrics.values()).filter(
      (m) => m.experimentId === experimentId
    );
  }

  putMetric(metric: ExperimentMetric): void {
    this.metrics.set(metric.id, metric);
  }

  deleteMetric(id: string): void {
    this.metrics.delete(id);
  }

  getGuardrail(id: string): Guardrail | undefined {
    return this.guardrails.get(id);
  }

  listGuardrails(experimentId: string): readonly Guardrail[] {
    return Array.from(this.guardrails.values()).filter(
      (g) => g.experimentId === experimentId
    );
  }

  putGuardrail(guardrail: Guardrail): void {
    this.guardrails.set(guardrail.id, guardrail);
  }

  deleteGuardrail(id: string): void {
    this.guardrails.delete(id);
  }
}

/** High-level registry wrapping a store with domain validation */
export class ExperimentRegistry {
  constructor(private readonly store: ExperimentStore = new InMemoryExperimentStore()) {}

  /** Register a new experiment; throws ConflictError if key already taken */
  registerExperiment(experiment: Experiment): void {
    if (this.store.getExperimentByKey(experiment.key)) {
      throw new ConflictError({
        message: `Experiment key already registered: ${experiment.key}`,
      });
    }
    this.store.putExperiment(experiment);
  }

  /** Upsert an experiment unconditionally */
  upsertExperiment(experiment: Experiment): void {
    this.store.putExperiment(experiment);
  }

  /** Find by ID; throws NotFoundError if absent */
  getExperiment(id: string): Experiment {
    const exp = this.store.getExperiment(id);
    if (!exp) throw new NotFoundError({ message: `Experiment not found: ${id}` });
    return exp;
  }

  /** Find by key; throws NotFoundError if absent */
  getExperimentByKey(key: string): Experiment {
    const exp = this.store.getExperimentByKey(key);
    if (!exp) throw new NotFoundError({ message: `Experiment not found by key: ${key}` });
    return exp;
  }

  listExperiments(): readonly Experiment[] {
    return this.store.listExperiments();
  }

  removeExperiment(id: string): void {
    this.store.deleteExperiment(id);
  }

  addVariant(variant: Variant): void {
    this.store.putVariant(variant);
  }

  getVariant(id: string): Variant {
    const v = this.store.getVariant(id);
    if (!v) throw new NotFoundError({ message: `Variant not found: ${id}` });
    return v;
  }

  listVariants(experimentId: string): readonly Variant[] {
    return this.store.listVariants(experimentId);
  }

  addMetric(metric: ExperimentMetric): void {
    this.store.putMetric(metric);
  }

  getMetric(id: string): ExperimentMetric {
    const m = this.store.getMetric(id);
    if (!m) throw new NotFoundError({ message: `Metric not found: ${id}` });
    return m;
  }

  listMetrics(experimentId: string): readonly ExperimentMetric[] {
    return this.store.listMetrics(experimentId);
  }

  addGuardrail(guardrail: Guardrail): void {
    this.store.putGuardrail(guardrail);
  }

  getGuardrail(id: string): Guardrail {
    const g = this.store.getGuardrail(id);
    if (!g) throw new NotFoundError({ message: `Guardrail not found: ${id}` });
    return g;
  }

  listGuardrails(experimentId: string): readonly Guardrail[] {
    return this.store.listGuardrails(experimentId);
  }
}

/** Module-level default registry backed by in-memory store */
export const defaultRegistry = new ExperimentRegistry();
