// Catalog service — unified facade for dataset discovery and management.
import { Result, ok, err } from "@veritas/core";
import type {
  Dataset,
  CreateDataset,
  UpdateDataset,
  DatasetId,
  TagId,
  OwnerId,
  CatalogSearchQuery,
  CatalogSearchResult,
  Tag,
  CreateTag,
  Owner,
  CreateOwner,
} from "./types.js";
import type { DatasetRepository } from "./dataset.js";
import type { TagRepository } from "./tag.js";
import type { OwnerRepository } from "./owner.js";
import { DatasetNotFoundError, DatasetConflictError, TagNotFoundError, OwnerNotFoundError } from "./errors.js";

export interface CatalogService {
  // Dataset operations
  getDataset(id: DatasetId): Promise<Result<Dataset, DatasetNotFoundError>>;
  listDatasets(): Promise<readonly Dataset[]>;
  createDataset(input: CreateDataset): Promise<Result<Dataset, DatasetConflictError>>;
  updateDataset(id: DatasetId, input: UpdateDataset): Promise<Result<Dataset, DatasetNotFoundError>>;
  deleteDataset(id: DatasetId): Promise<Result<void, DatasetNotFoundError>>;
  search(query: CatalogSearchQuery): Promise<CatalogSearchResult>;

  // Tag operations
  getTag(id: TagId): Promise<Result<Tag, TagNotFoundError>>;
  listTags(): Promise<readonly Tag[]>;
  createTag(input: CreateTag): Promise<Tag>;
  deleteTag(id: TagId): Promise<Result<void, TagNotFoundError>>;

  // Owner operations
  getOwner(id: OwnerId): Promise<Result<Owner, OwnerNotFoundError>>;
  listOwners(): Promise<readonly Owner[]>;
  createOwner(input: CreateOwner): Promise<Owner>;
}

export class DefaultCatalogService implements CatalogService {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly tags: TagRepository,
    private readonly owners: OwnerRepository
  ) {}

  async getDataset(id: DatasetId): Promise<Result<Dataset, DatasetNotFoundError>> {
    return this.datasets.findById(id);
  }

  async listDatasets(): Promise<readonly Dataset[]> {
    return this.datasets.findAll();
  }

  async createDataset(input: CreateDataset): Promise<Result<Dataset, DatasetConflictError>> {
    return this.datasets.create(input);
  }

  async updateDataset(
    id: DatasetId,
    input: UpdateDataset
  ): Promise<Result<Dataset, DatasetNotFoundError>> {
    return this.datasets.update(id, input);
  }

  async deleteDataset(id: DatasetId): Promise<Result<void, DatasetNotFoundError>> {
    return this.datasets.delete(id);
  }

  async search(query: CatalogSearchQuery): Promise<CatalogSearchResult> {
    const all = await this.datasets.findAll();
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const filtered = all.filter((ds) => {
      if (query.q) {
        const q = query.q.toLowerCase();
        const matchName = ds.name.toLowerCase().includes(q);
        const matchDesc = ds.description.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      if (query.ownerId && (ds.ownerId as string) !== (query.ownerId as string)) return false;
      if (query.format && ds.format !== query.format) return false;
      if (query.status && ds.status !== query.status) return false;
      if (query.tags && query.tags.length > 0) {
        const dsTagSet = new Set(ds.tags.map((t) => t as string));
        if (!query.tags.every((t) => dsTagSet.has(t as string))) return false;
      }
      return true;
    });

    return {
      datasets: Object.freeze(filtered.slice(offset, offset + limit)),
      total: filtered.length,
      limit,
      offset,
    };
  }

  async getTag(id: TagId): Promise<Result<Tag, TagNotFoundError>> {
    return this.tags.findById(id);
  }

  async listTags(): Promise<readonly Tag[]> {
    return this.tags.findAll();
  }

  async createTag(input: CreateTag): Promise<Tag> {
    return this.tags.create(input);
  }

  async deleteTag(id: TagId): Promise<Result<void, TagNotFoundError>> {
    return this.tags.delete(id);
  }

  async getOwner(id: OwnerId): Promise<Result<Owner, OwnerNotFoundError>> {
    return this.owners.findById(id);
  }

  async listOwners(): Promise<readonly Owner[]> {
    return this.owners.findAll();
  }

  async createOwner(input: CreateOwner): Promise<Owner> {
    return this.owners.create(input);
  }
}
