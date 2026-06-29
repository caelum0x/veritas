// Dataset CRUD operations — core entity management for the data catalog.
import { Result, ok, err, newId } from "@veritas/core";
import type {
  Dataset,
  CreateDataset,
  UpdateDataset,
  DatasetId,
  OwnerId,
  TagId,
} from "./types.js";
import { datasetId } from "./types.js";
import { DatasetNotFoundError, DatasetConflictError } from "./errors.js";

export interface DatasetRepository {
  findById(id: DatasetId): Promise<Result<Dataset, DatasetNotFoundError>>;
  findAll(): Promise<readonly Dataset[]>;
  findByOwner(ownerId: OwnerId): Promise<readonly Dataset[]>;
  findByTag(tagId: TagId): Promise<readonly Dataset[]>;
  create(input: CreateDataset): Promise<Result<Dataset, DatasetConflictError>>;
  update(id: DatasetId, input: UpdateDataset): Promise<Result<Dataset, DatasetNotFoundError>>;
  delete(id: DatasetId): Promise<Result<void, DatasetNotFoundError>>;
}

export class InMemoryDatasetRepository implements DatasetRepository {
  private readonly store = new Map<string, Dataset>();

  async findById(id: DatasetId): Promise<Result<Dataset, DatasetNotFoundError>> {
    const ds = this.store.get(id as string);
    return ds ? ok(ds) : err(new DatasetNotFoundError(id as string));
  }

  async findAll(): Promise<readonly Dataset[]> {
    return Object.freeze([...this.store.values()]);
  }

  async findByOwner(ownerId: OwnerId): Promise<readonly Dataset[]> {
    return Object.freeze(
      [...this.store.values()].filter((d) => (d.ownerId as string) === (ownerId as string))
    );
  }

  async findByTag(tagId: TagId): Promise<readonly Dataset[]> {
    return Object.freeze(
      [...this.store.values()].filter((d) =>
        d.tags.some((t) => (t as string) === (tagId as string))
      )
    );
  }

  async create(input: CreateDataset): Promise<Result<Dataset, DatasetConflictError>> {
    const existing = [...this.store.values()].find((d) => d.name === input.name);
    if (existing) return err(new DatasetConflictError(input.name));

    const now = new Date().toISOString();
    const ds: Dataset = {
      id: datasetId(newId("dataset")),
      name: input.name,
      description: input.description,
      format: input.format,
      status: input.status ?? "draft",
      ownerId: input.ownerId,
      schema: input.schema,
      tags: input.tags ?? [],
      location: input.location,
      rowCount: input.rowCount,
      sizeBytes: input.sizeBytes,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(ds.id as string, ds);
    return ok(ds);
  }

  async update(
    id: DatasetId,
    input: UpdateDataset
  ): Promise<Result<Dataset, DatasetNotFoundError>> {
    const existing = this.store.get(id as string);
    if (!existing) return err(new DatasetNotFoundError(id as string));

    const updated: Dataset = {
      ...existing,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.format !== undefined && { format: input.format }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.ownerId !== undefined && { ownerId: input.ownerId }),
      ...(input.schema !== undefined && { schema: input.schema }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.rowCount !== undefined && { rowCount: input.rowCount }),
      ...(input.sizeBytes !== undefined && { sizeBytes: input.sizeBytes }),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id as string, updated);
    return ok(updated);
  }

  async delete(id: DatasetId): Promise<Result<void, DatasetNotFoundError>> {
    if (!this.store.has(id as string)) return err(new DatasetNotFoundError(id as string));
    this.store.delete(id as string);
    return ok(undefined);
  }
}
