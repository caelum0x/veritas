// Data flow mapping: register and audit flows of classified data between systems

import { type Result, ok, err } from "@veritas/core";
import { atLeast } from "./classification.js";
import {
  DataFlowNotFoundError,
  ClassificationConflictError,
  UnencryptedFlowError,
} from "./errors.js";
import type { DataFlow, CreateDataFlow, DataFlowDirection } from "./types.js";

export interface DataFlowMap {
  register(
    flow: CreateDataFlow,
  ): Result<DataFlow, ClassificationConflictError | UnencryptedFlowError>;
  get(id: string): Result<DataFlow, DataFlowNotFoundError>;
  update(
    id: string,
    patch: Partial<Omit<DataFlow, "id" | "createdAt">>,
  ): Result<DataFlow, DataFlowNotFoundError | UnencryptedFlowError>;
  remove(id: string): Result<void, DataFlowNotFoundError>;
  list(filter?: DataFlowFilter): readonly DataFlow[];
  forAsset(assetId: string): readonly DataFlow[];
}

export interface DataFlowFilter {
  readonly assetId?: string;
  readonly direction?: DataFlowDirection;
  readonly source?: string;
  readonly destination?: string;
  readonly encrypted?: boolean;
}

/** Flows carrying confidential or restricted data must be encrypted. */
function validateEncryption(flow: {
  classification: DataFlow["classification"];
  encrypted: boolean;
  id: string;
}): Result<void, UnencryptedFlowError> {
  if (atLeast(flow.classification, "confidential") && !flow.encrypted) {
    return err(new UnencryptedFlowError(flow.id, flow.classification));
  }
  return ok(undefined);
}

export function createInMemoryFlowMap(): DataFlowMap {
  const store = new Map<string, DataFlow>();

  function register(
    flow: CreateDataFlow,
  ): Result<DataFlow, ClassificationConflictError | UnencryptedFlowError> {
    if (store.has(flow.id)) {
      return err(new ClassificationConflictError(flow.id));
    }
    const encCheck = validateEncryption(flow);
    if (!encCheck.ok) return encCheck as Result<never, UnencryptedFlowError>;

    const now = new Date().toISOString();
    const record: DataFlow = { ...flow, createdAt: now, updatedAt: now };
    store.set(flow.id, record);
    return ok(record);
  }

  function get(id: string): Result<DataFlow, DataFlowNotFoundError> {
    const flow = store.get(id);
    if (!flow) return err(new DataFlowNotFoundError(id));
    return ok(flow);
  }

  function update(
    id: string,
    patch: Partial<Omit<DataFlow, "id" | "createdAt">>,
  ): Result<DataFlow, DataFlowNotFoundError | UnencryptedFlowError> {
    const existing = store.get(id);
    if (!existing) return err(new DataFlowNotFoundError(id));
    const updated: DataFlow = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const encCheck = validateEncryption(updated);
    if (!encCheck.ok) return encCheck as Result<never, UnencryptedFlowError>;
    store.set(id, updated);
    return ok(updated);
  }

  function remove(id: string): Result<void, DataFlowNotFoundError> {
    if (!store.has(id)) return err(new DataFlowNotFoundError(id));
    store.delete(id);
    return ok(undefined);
  }

  function list(filter?: DataFlowFilter): readonly DataFlow[] {
    let flows = Array.from(store.values());
    if (filter?.assetId) flows = flows.filter((f) => f.assetId === filter.assetId);
    if (filter?.direction) flows = flows.filter((f) => f.direction === filter.direction);
    if (filter?.source) flows = flows.filter((f) => f.source === filter.source);
    if (filter?.destination) flows = flows.filter((f) => f.destination === filter.destination);
    if (filter?.encrypted !== undefined)
      flows = flows.filter((f) => f.encrypted === filter.encrypted);
    return flows;
  }

  function forAsset(assetId: string): readonly DataFlow[] {
    return list({ assetId });
  }

  return { register, get, update, remove, list, forAsset };
}
