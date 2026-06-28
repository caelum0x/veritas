// Data inventory: register, retrieve, and list classified data assets

import { type Result, ok, err } from "@veritas/core";
import type { ClassificationLevel } from "./classification.js";
import {
  ClassificationNotFoundError,
  ClassificationConflictError,
} from "./errors.js";
import type { DataAsset, CreateDataAsset } from "./types.js";

export interface DataInventory {
  register(asset: CreateDataAsset): Result<DataAsset, ClassificationConflictError>;
  get(id: string): Result<DataAsset, ClassificationNotFoundError>;
  update(
    id: string,
    patch: Partial<Omit<DataAsset, "id" | "createdAt">>,
  ): Result<DataAsset, ClassificationNotFoundError>;
  remove(id: string): Result<void, ClassificationNotFoundError>;
  list(filter?: InventoryFilter): readonly DataAsset[];
  findByOwner(owner: string): readonly DataAsset[];
  findByClassification(level: ClassificationLevel): readonly DataAsset[];
}

export interface InventoryFilter {
  readonly classification?: ClassificationLevel;
  readonly owner?: string;
  readonly tag?: { key: string; value: string };
}

export function createInMemoryInventory(): DataInventory {
  const store = new Map<string, DataAsset>();

  function register(
    asset: CreateDataAsset,
  ): Result<DataAsset, ClassificationConflictError> {
    if (store.has(asset.id)) {
      return err(new ClassificationConflictError(asset.id));
    }
    const now = new Date().toISOString();
    const record: DataAsset = { ...asset, createdAt: now, updatedAt: now };
    store.set(asset.id, record);
    return ok(record);
  }

  function get(id: string): Result<DataAsset, ClassificationNotFoundError> {
    const asset = store.get(id);
    if (!asset) return err(new ClassificationNotFoundError(id));
    return ok(asset);
  }

  function update(
    id: string,
    patch: Partial<Omit<DataAsset, "id" | "createdAt">>,
  ): Result<DataAsset, ClassificationNotFoundError> {
    const existing = store.get(id);
    if (!existing) return err(new ClassificationNotFoundError(id));
    const updated: DataAsset = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return ok(updated);
  }

  function remove(id: string): Result<void, ClassificationNotFoundError> {
    if (!store.has(id)) return err(new ClassificationNotFoundError(id));
    store.delete(id);
    return ok(undefined);
  }

  function list(filter?: InventoryFilter): readonly DataAsset[] {
    let assets = Array.from(store.values());
    if (filter?.classification) {
      assets = assets.filter((a) => a.classification === filter.classification);
    }
    if (filter?.owner) {
      assets = assets.filter((a) => a.owner === filter.owner);
    }
    if (filter?.tag) {
      const { key, value } = filter.tag;
      assets = assets.filter((a) => a.tags[key] === value);
    }
    return assets;
  }

  function findByOwner(owner: string): readonly DataAsset[] {
    return list({ owner });
  }

  function findByClassification(level: ClassificationLevel): readonly DataAsset[] {
    return list({ classification: level });
  }

  return { register, get, update, remove, list, findByOwner, findByClassification };
}
