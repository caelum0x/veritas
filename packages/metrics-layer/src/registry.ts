// Metric registry: in-memory store for metrics, dimensions, and definitions.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Metric, CreateMetric } from "./metric.js";
import type { Dimension, CreateDimension } from "./dimension.js";
import type { MetricDefinition, CreateMetricDefinition } from "./definition.js";
import {
  MetricNotFoundError,
  DimensionNotFoundError,
  MetricDefinitionNotFoundError,
  MetricRegistryConflictError,
} from "./errors.js";

export interface MetricRegistry {
  /** Register a new metric; errors on duplicate id */
  registerMetric(metric: CreateMetric): Result<Metric, MetricRegistryConflictError>;
  /** Retrieve a metric by id */
  getMetric(id: string): Result<Metric, MetricNotFoundError>;
  /** List all registered metrics */
  listMetrics(): readonly Metric[];
  /** Remove a metric by id */
  removeMetric(id: string): Result<void, MetricNotFoundError>;

  /** Register a dimension; errors on duplicate id */
  registerDimension(dimension: CreateDimension): Result<Dimension, MetricRegistryConflictError>;
  /** Retrieve a dimension by id */
  getDimension(id: string): Result<Dimension, DimensionNotFoundError>;
  /** List all dimensions */
  listDimensions(): readonly Dimension[];

  /** Register a metric definition; errors on duplicate id */
  registerDefinition(
    def: CreateMetricDefinition
  ): Result<MetricDefinition, MetricRegistryConflictError>;
  /** Retrieve a definition by id */
  getDefinition(id: string): Result<MetricDefinition, MetricDefinitionNotFoundError>;
  /** Get the definition for a specific metric id */
  getDefinitionForMetric(
    metricId: string
  ): Result<MetricDefinition, MetricDefinitionNotFoundError>;
  /** List all definitions */
  listDefinitions(): readonly MetricDefinition[];
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Create an in-memory MetricRegistry; suitable for testing and single-process deployments. */
export function createInMemoryMetricRegistry(): MetricRegistry {
  const metrics = new Map<string, Metric>();
  const dimensions = new Map<string, Dimension>();
  const definitions = new Map<string, MetricDefinition>();
  // index: metricId -> definition id
  const metricToDefinition = new Map<string, string>();

  return {
    registerMetric(input: CreateMetric): Result<Metric, MetricRegistryConflictError> {
      if (metrics.has(input.id)) {
        return err(new MetricRegistryConflictError(input.id));
      }
      const now = nowIso();
      const metric: Metric = { ...input, createdAt: now, updatedAt: now };
      metrics.set(metric.id, metric);
      return ok(metric);
    },

    getMetric(id: string): Result<Metric, MetricNotFoundError> {
      const m = metrics.get(id);
      return m ? ok(m) : err(new MetricNotFoundError(id));
    },

    listMetrics(): readonly Metric[] {
      return Array.from(metrics.values());
    },

    removeMetric(id: string): Result<void, MetricNotFoundError> {
      if (!metrics.has(id)) return err(new MetricNotFoundError(id));
      metrics.delete(id);
      return ok(undefined);
    },

    registerDimension(input: CreateDimension): Result<Dimension, MetricRegistryConflictError> {
      if (dimensions.has(input.id)) {
        return err(new MetricRegistryConflictError(input.id));
      }
      dimensions.set(input.id, input);
      return ok(input);
    },

    getDimension(id: string): Result<Dimension, DimensionNotFoundError> {
      const d = dimensions.get(id);
      return d ? ok(d) : err(new DimensionNotFoundError(id));
    },

    listDimensions(): readonly Dimension[] {
      return Array.from(dimensions.values());
    },

    registerDefinition(
      input: CreateMetricDefinition
    ): Result<MetricDefinition, MetricRegistryConflictError> {
      if (definitions.has(input.id)) {
        return err(new MetricRegistryConflictError(input.id));
      }
      const now = nowIso();
      const def: MetricDefinition = { ...input, createdAt: now, updatedAt: now };
      definitions.set(def.id, def);
      metricToDefinition.set(def.metricId, def.id);
      return ok(def);
    },

    getDefinition(id: string): Result<MetricDefinition, MetricDefinitionNotFoundError> {
      const d = definitions.get(id);
      return d ? ok(d) : err(new MetricDefinitionNotFoundError(id));
    },

    getDefinitionForMetric(
      metricId: string
    ): Result<MetricDefinition, MetricDefinitionNotFoundError> {
      const defId = metricToDefinition.get(metricId);
      if (!defId) return err(new MetricDefinitionNotFoundError(metricId));
      const d = definitions.get(defId);
      return d ? ok(d) : err(new MetricDefinitionNotFoundError(metricId));
    },

    listDefinitions(): readonly MetricDefinition[] {
      return Array.from(definitions.values());
    },
  };
}
