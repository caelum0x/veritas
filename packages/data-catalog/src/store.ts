// Catalog store: unified in-memory persistence for datasets, tags, and owners.
import { z } from "zod";
import { Result, ok, err, newId, ValidationError } from "@veritas/core";
import { AppError } from "@veritas/core";
import type { DatasetId, TagId, OwnerId } from "./types.js";
import { datasetId, tagId, ownerId } from "./types.js";
import {
  DatasetNotFoundError,
  DatasetConflictError,
  TagNotFoundError,
  OwnerNotFoundError,
} from "./errors.js";

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
  description: z.string().optional(),
});
export type CreateTag = z.infer<typeof CreateTagSchema>;

export interface Tag {
  readonly id: TagId;
  readonly name: string;
  readonly color?: string;
  readonly description?: string;
  readonly createdAt: string;
}

export const CreateOwnerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  team: z.string().optional(),
  slackHandle: z.string().optional(),
});
export type CreateOwner = z.infer<typeof CreateOwnerSchema>;

export interface Owner {
  readonly id: OwnerId;
  readonly name: string;
  readonly email?: string;
  readonly team?: string;
  readonly slackHandle?: string;
  readonly createdAt: string;
}

export const CreateDatasetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().default(""),
  format: z.enum(["csv", "json", "parquet", "avro", "orc", "ndjson", "xml", "unknown"]).default("unknown"),
  tagIds: z.array(z.string()).default([]),
  ownerIds: z.array(z.string()).default([]),
  sourceUri: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CreateDataset = z.infer<typeof CreateDatasetSchema>;

export const UpdateDatasetSchema = CreateDatasetSchema.partial();
export type UpdateDataset = z.infer<typeof UpdateDatasetSchema>;

export interface Dataset {
  readonly id: DatasetId;
  readonly name: string;
  readonly description: string;
  readonly format: string;
  readonly tagIds: ReadonlyArray<TagId>;
  readonly ownerIds: ReadonlyArray<OwnerId>;
  readonly sourceUri?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CatalogStore {
  // Tags
  createTag(input: CreateTag): Promise<Result<Tag, AppError>>;
  getTag(id: TagId): Promise<Result<Tag, AppError>>;
  listTags(): Promise<Result<ReadonlyArray<Tag>, AppError>>;
  deleteTag(id: TagId): Promise<Result<void, AppError>>;

  // Owners
  createOwner(input: CreateOwner): Promise<Result<Owner, AppError>>;
  getOwner(id: OwnerId): Promise<Result<Owner, AppError>>;
  listOwners(): Promise<Result<ReadonlyArray<Owner>, AppError>>;
  deleteOwner(id: OwnerId): Promise<Result<void, AppError>>;

  // Datasets
  createDataset(input: CreateDataset): Promise<Result<Dataset, AppError>>;
  getDataset(id: DatasetId): Promise<Result<Dataset, AppError>>;
  updateDataset(id: DatasetId, input: UpdateDataset): Promise<Result<Dataset, AppError>>;
  deleteDataset(id: DatasetId): Promise<Result<void, AppError>>;
  listDatasets(): Promise<Result<ReadonlyArray<Dataset>, AppError>>;
  findDatasetByName(name: string): Promise<Result<Dataset | undefined, AppError>>;
}

export class InMemoryCatalogStore implements CatalogStore {
  private readonly tags: Map<TagId, Tag> = new Map();
  private readonly tagsByName: Map<string, TagId> = new Map();
  private readonly owners: Map<OwnerId, Owner> = new Map();
  private readonly datasets: Map<DatasetId, Dataset> = new Map();
  private readonly datasetsByName: Map<string, DatasetId> = new Map();

  async createTag(input: CreateTag): Promise<Result<Tag, AppError>> {
    const parsed = CreateTagSchema.safeParse(input);
    if (!parsed.success) return err(new ValidationError({ message: parsed.error.message }));
    if (this.tagsByName.has(parsed.data.name.toLowerCase())) {
      return err(new ValidationError({ message: `Tag already exists: ${parsed.data.name}` }));
    }
    const id = tagId(newId("tag"));
    const tag: Tag = { id, name: parsed.data.name, color: parsed.data.color, description: parsed.data.description, createdAt: new Date().toISOString() };
    this.tags.set(id, tag);
    this.tagsByName.set(parsed.data.name.toLowerCase(), id);
    return ok(tag);
  }

  async getTag(id: TagId): Promise<Result<Tag, AppError>> {
    const tag = this.tags.get(id);
    if (!tag) return err(new TagNotFoundError(id));
    return ok(tag);
  }

  async listTags(): Promise<Result<ReadonlyArray<Tag>, AppError>> {
    return ok(Array.from(this.tags.values()));
  }

  async deleteTag(id: TagId): Promise<Result<void, AppError>> {
    const tag = this.tags.get(id);
    if (!tag) return err(new TagNotFoundError(id));
    this.tags.delete(id);
    this.tagsByName.delete(tag.name.toLowerCase());
    return ok(undefined);
  }

  async createOwner(input: CreateOwner): Promise<Result<Owner, AppError>> {
    const parsed = CreateOwnerSchema.safeParse(input);
    if (!parsed.success) return err(new ValidationError({ message: parsed.error.message }));
    const id = ownerId(newId("owner"));
    const owner: Owner = { id, name: parsed.data.name, email: parsed.data.email, team: parsed.data.team, slackHandle: parsed.data.slackHandle, createdAt: new Date().toISOString() };
    this.owners.set(id, owner);
    return ok(owner);
  }

  async getOwner(id: OwnerId): Promise<Result<Owner, AppError>> {
    const owner = this.owners.get(id);
    if (!owner) return err(new OwnerNotFoundError(id));
    return ok(owner);
  }

  async listOwners(): Promise<Result<ReadonlyArray<Owner>, AppError>> {
    return ok(Array.from(this.owners.values()));
  }

  async deleteOwner(id: OwnerId): Promise<Result<void, AppError>> {
    if (!this.owners.has(id)) return err(new OwnerNotFoundError(id));
    this.owners.delete(id);
    return ok(undefined);
  }

  async createDataset(input: CreateDataset): Promise<Result<Dataset, AppError>> {
    const parsed = CreateDatasetSchema.safeParse(input);
    if (!parsed.success) return err(new ValidationError({ message: parsed.error.message }));
    if (this.datasetsByName.has(parsed.data.name.toLowerCase())) {
      return err(new DatasetConflictError(parsed.data.name));
    }
    const now = new Date().toISOString();
    const id = datasetId(newId("dataset"));
    const dataset: Dataset = {
      id,
      name: parsed.data.name,
      description: parsed.data.description,
      format: parsed.data.format,
      tagIds: parsed.data.tagIds.map(t => tagId(t)),
      ownerIds: parsed.data.ownerIds.map(o => ownerId(o)),
      sourceUri: parsed.data.sourceUri,
      metadata: parsed.data.metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.datasets.set(id, dataset);
    this.datasetsByName.set(parsed.data.name.toLowerCase(), id);
    return ok(dataset);
  }

  async getDataset(id: DatasetId): Promise<Result<Dataset, AppError>> {
    const dataset = this.datasets.get(id);
    if (!dataset) return err(new DatasetNotFoundError(id));
    return ok(dataset);
  }

  async updateDataset(id: DatasetId, input: UpdateDataset): Promise<Result<Dataset, AppError>> {
    const existing = this.datasets.get(id);
    if (!existing) return err(new DatasetNotFoundError(id));
    const parsed = UpdateDatasetSchema.safeParse(input);
    if (!parsed.success) return err(new ValidationError({ message: parsed.error.message }));

    if (parsed.data.name && parsed.data.name.toLowerCase() !== existing.name.toLowerCase()) {
      if (this.datasetsByName.has(parsed.data.name.toLowerCase())) {
        return err(new DatasetConflictError(parsed.data.name));
      }
      this.datasetsByName.delete(existing.name.toLowerCase());
      this.datasetsByName.set(parsed.data.name.toLowerCase(), id);
    }

    const updated: Dataset = {
      ...existing,
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.format !== undefined ? { format: parsed.data.format } : {}),
      ...(parsed.data.tagIds !== undefined ? { tagIds: parsed.data.tagIds.map(t => tagId(t)) } : {}),
      ...(parsed.data.ownerIds !== undefined ? { ownerIds: parsed.data.ownerIds.map(o => ownerId(o)) } : {}),
      ...(parsed.data.sourceUri !== undefined ? { sourceUri: parsed.data.sourceUri } : {}),
      ...(parsed.data.metadata !== undefined ? { metadata: parsed.data.metadata } : {}),
      updatedAt: new Date().toISOString(),
    };

    this.datasets.set(id, updated);
    return ok(updated);
  }

  async deleteDataset(id: DatasetId): Promise<Result<void, AppError>> {
    const existing = this.datasets.get(id);
    if (!existing) return err(new DatasetNotFoundError(id));
    this.datasets.delete(id);
    this.datasetsByName.delete(existing.name.toLowerCase());
    return ok(undefined);
  }

  async listDatasets(): Promise<Result<ReadonlyArray<Dataset>, AppError>> {
    return ok(Array.from(this.datasets.values()));
  }

  async findDatasetByName(name: string): Promise<Result<Dataset | undefined, AppError>> {
    const id = this.datasetsByName.get(name.toLowerCase());
    if (!id) return ok(undefined);
    return ok(this.datasets.get(id));
  }
}
