// In-memory experiment store — port interface + default implementation
import { Result, ok, err, Page, makePage } from "@veritas/core";
import { Experiment, Assignment, Exposure, ExperimentStatus } from "./types.js";
import {
  ExperimentNotFoundError,
  ExperimentConflictError,
  ExperimentValidationError,
} from "./errors.js";

export interface ExperimentFilter {
  readonly status?: ExperimentStatus;
  readonly tag?: string;
  readonly createdBy?: string;
}

export interface ExperimentStore {
  save(experiment: Experiment): Promise<Result<Experiment, ExperimentConflictError | ExperimentValidationError>>;
  update(experiment: Experiment): Promise<Result<Experiment, ExperimentNotFoundError>>;
  findById(id: string): Promise<Result<Experiment, ExperimentNotFoundError>>;
  findByKey(key: string): Promise<Result<Experiment, ExperimentNotFoundError>>;
  list(filter: ExperimentFilter, page: number, limit: number): Promise<Page<Experiment>>;
  delete(id: string): Promise<Result<void, ExperimentNotFoundError>>;

  saveAssignment(assignment: Assignment): Promise<Result<Assignment, never>>;
  findAssignment(experimentId: string, unitId: string): Promise<Assignment | undefined>;

  saveExposure(exposure: Exposure): Promise<Result<Exposure, never>>;
  listExposures(experimentId: string, limit: number): Promise<Exposure[]>;
}

export class InMemoryExperimentStore implements ExperimentStore {
  private readonly experiments = new Map<string, Experiment>();
  private readonly keyIndex = new Map<string, string>();
  private readonly assignments = new Map<string, Assignment>();
  private readonly exposures: Exposure[] = [];

  async save(
    experiment: Experiment
  ): Promise<Result<Experiment, ExperimentConflictError | ExperimentValidationError>> {
    if (this.keyIndex.has(experiment.key)) {
      return err(new ExperimentConflictError(experiment.key));
    }
    if (experiment.variants.length < 2) {
      return err(new ExperimentValidationError("Experiment must have at least 2 variants"));
    }
    const weightSum = experiment.variants.reduce((s, v) => s + v.weight, 0);
    if (Math.abs(weightSum - 1) > 0.001) {
      return err(new ExperimentValidationError(`Variant weights must sum to 1, got ${weightSum}`));
    }
    this.experiments.set(experiment.id, experiment);
    this.keyIndex.set(experiment.key, experiment.id);
    return ok(experiment);
  }

  async update(
    experiment: Experiment
  ): Promise<Result<Experiment, ExperimentNotFoundError>> {
    if (!this.experiments.has(experiment.id)) {
      return err(new ExperimentNotFoundError(experiment.id));
    }
    const existing = this.experiments.get(experiment.id)!;
    if (existing.key !== experiment.key) {
      this.keyIndex.delete(existing.key);
      this.keyIndex.set(experiment.key, experiment.id);
    }
    this.experiments.set(experiment.id, experiment);
    return ok(experiment);
  }

  async findById(id: string): Promise<Result<Experiment, ExperimentNotFoundError>> {
    const experiment = this.experiments.get(id);
    if (!experiment) return err(new ExperimentNotFoundError(id));
    return ok(experiment);
  }

  async findByKey(key: string): Promise<Result<Experiment, ExperimentNotFoundError>> {
    const id = this.keyIndex.get(key);
    if (!id) return err(new ExperimentNotFoundError(key));
    return this.findById(id);
  }

  async list(filter: ExperimentFilter, page: number, limit: number): Promise<Page<Experiment>> {
    const all = Array.from(this.experiments.values()).filter((e) => {
      if (filter.status && e.status !== filter.status) return false;
      if (filter.tag && !e.tags.includes(filter.tag)) return false;
      if (filter.createdBy && e.createdBy !== filter.createdBy) return false;
      return true;
    });
    const offset = (page - 1) * limit;
    const items = all.slice(offset, offset + limit);
    const offset2 = offset + limit;
    const nextCursor = offset2 < all.length ? String(offset2) : null;
    return makePage(items, nextCursor);
  }

  async delete(id: string): Promise<Result<void, ExperimentNotFoundError>> {
    const experiment = this.experiments.get(id);
    if (!experiment) return err(new ExperimentNotFoundError(id));
    this.keyIndex.delete(experiment.key);
    this.experiments.delete(id);
    return ok(undefined);
  }

  async saveAssignment(assignment: Assignment): Promise<Result<Assignment, never>> {
    const key = `${assignment.experimentId}:${assignment.unitId}`;
    this.assignments.set(key, assignment);
    return ok(assignment);
  }

  async findAssignment(experimentId: string, unitId: string): Promise<Assignment | undefined> {
    return this.assignments.get(`${experimentId}:${unitId}`);
  }

  async saveExposure(exposure: Exposure): Promise<Result<Exposure, never>> {
    this.exposures.push(exposure);
    return ok(exposure);
  }

  async listExposures(experimentId: string, limit: number): Promise<Exposure[]> {
    return this.exposures
      .filter((e) => e.experimentId === experimentId)
      .slice(-limit);
  }
}
