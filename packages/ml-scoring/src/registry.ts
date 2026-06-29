// Model registry: in-memory store for registering and retrieving Model instances by id.

import { ok, err, type Result } from "@veritas/core";
import type { Model, ModelMeta } from "./model.js";
import type { MlScoringError } from "./errors.js";
import { ModelNotFoundError, ModelAlreadyRegisteredError } from "./errors.js";

/** Port interface for a model registry. */
export interface ModelRegistry {
  /** Register a model; fails if a model with the same id is already registered. */
  register(model: Model): Result<ModelMeta, MlScoringError>;
  /** Retrieve a model by its modelId. */
  get(modelId: string): Result<Model, MlScoringError>;
  /** List metadata of all registered models. */
  list(): ReadonlyArray<ModelMeta>;
  /** Remove a model from the registry. */
  unregister(modelId: string): Result<void, MlScoringError>;
}

/** In-memory implementation of ModelRegistry. */
export class InMemoryModelRegistry implements ModelRegistry {
  private readonly models: Map<string, Model> = new Map();

  register(model: Model): Result<ModelMeta, MlScoringError> {
    if (this.models.has(model.meta.modelId)) {
      return err(new ModelAlreadyRegisteredError(model.meta.modelId));
    }
    this.models.set(model.meta.modelId, model);
    return ok(Object.freeze({ ...model.meta }));
  }

  get(modelId: string): Result<Model, MlScoringError> {
    const model = this.models.get(modelId);
    if (model === undefined) return err(new ModelNotFoundError(modelId));
    return ok(model);
  }

  list(): ReadonlyArray<ModelMeta> {
    return Object.freeze([...this.models.values()].map((m) => Object.freeze({ ...m.meta })));
  }

  unregister(modelId: string): Result<void, MlScoringError> {
    if (!this.models.has(modelId)) return err(new ModelNotFoundError(modelId));
    this.models.delete(modelId);
    return ok(undefined);
  }
}

/** Singleton factory returning a fresh InMemoryModelRegistry. */
export function createModelRegistry(): ModelRegistry {
  return new InMemoryModelRegistry();
}
