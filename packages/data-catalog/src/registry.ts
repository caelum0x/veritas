// Dataset registry: tracks physical dataset locations and connection metadata.
import { z } from "zod";
import { Result, ok, err, newId, ValidationError } from "@veritas/core";
import { AppError } from "@veritas/core";
import type { DatasetId } from "./types.js";
import { datasetId } from "./types.js";
import { RegistryEntryNotFoundError, DatasetConflictError } from "./errors.js";

export const ConnectionConfigSchema = z.object({
  type: z.enum(["s3", "gcs", "azure-blob", "postgres", "bigquery", "snowflake", "redshift", "http", "local"]),
  uri: z.string().min(1),
  options: z.record(z.string(), z.unknown()).default({}),
});

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>;

export const CreateRegistryEntrySchema = z.object({
  name: z.string().min(1).max(200),
  datasetId: z.string().optional(),
  format: z.enum(["csv", "json", "parquet", "avro", "orc", "ndjson", "xml", "unknown"]).default("unknown"),
  connection: ConnectionConfigSchema,
  sizeBytes: z.number().int().nonnegative().optional(),
  rowCount: z.number().int().nonnegative().optional(),
  partitionKeys: z.array(z.string()).default([]),
  checksum: z.string().optional(),
  refreshedAt: z.string().optional(),
});

export type CreateRegistryEntry = z.infer<typeof CreateRegistryEntrySchema>;

export const UpdateRegistryEntrySchema = CreateRegistryEntrySchema.partial();
export type UpdateRegistryEntry = z.infer<typeof UpdateRegistryEntrySchema>;

export interface RegistryEntryId extends String { readonly _brand: "RegistryEntryId"; }
const registryEntryId = (v: string): RegistryEntryId => v as unknown as RegistryEntryId;

export interface RegistryEntry {
  readonly id: RegistryEntryId;
  readonly name: string;
  readonly datasetId?: DatasetId;
  readonly format: string;
  readonly connection: ConnectionConfig;
  readonly sizeBytes?: number;
  readonly rowCount?: number;
  readonly partitionKeys: ReadonlyArray<string>;
  readonly checksum?: string;
  readonly refreshedAt?: string;
  readonly registeredAt: string;
  readonly updatedAt: string;
}

export interface DatasetRegistryPort {
  register(input: CreateRegistryEntry): Promise<Result<RegistryEntry, AppError>>;
  getEntry(id: RegistryEntryId): Promise<Result<RegistryEntry, AppError>>;
  updateEntry(id: RegistryEntryId, input: UpdateRegistryEntry): Promise<Result<RegistryEntry, AppError>>;
  deregister(id: RegistryEntryId): Promise<Result<void, AppError>>;
  listEntries(): Promise<Result<ReadonlyArray<RegistryEntry>, AppError>>;
  findByDatasetId(datasetId: DatasetId): Promise<Result<ReadonlyArray<RegistryEntry>, AppError>>;
  findByName(name: string): Promise<Result<RegistryEntry | undefined, AppError>>;
}

export class InMemoryDatasetRegistry implements DatasetRegistryPort {
  private readonly store: Map<RegistryEntryId, RegistryEntry> = new Map();
  private readonly byName: Map<string, RegistryEntryId> = new Map();

  async register(input: CreateRegistryEntry): Promise<Result<RegistryEntry, AppError>> {
    const parsed = CreateRegistryEntrySchema.safeParse(input);
    if (!parsed.success) return err(new ValidationError({ message: parsed.error.message }));

    if (this.byName.has(parsed.data.name.toLowerCase())) {
      return err(new DatasetConflictError(parsed.data.name));
    }

    const now = new Date().toISOString();
    const id = registryEntryId(newId("reg"));
    const entry: RegistryEntry = {
      id,
      name: parsed.data.name,
      datasetId: parsed.data.datasetId ? datasetId(parsed.data.datasetId) : undefined,
      format: parsed.data.format,
      connection: parsed.data.connection,
      sizeBytes: parsed.data.sizeBytes,
      rowCount: parsed.data.rowCount,
      partitionKeys: parsed.data.partitionKeys,
      checksum: parsed.data.checksum,
      refreshedAt: parsed.data.refreshedAt,
      registeredAt: now,
      updatedAt: now,
    };

    this.store.set(id, entry);
    this.byName.set(parsed.data.name.toLowerCase(), id);
    return ok(entry);
  }

  async getEntry(id: RegistryEntryId): Promise<Result<RegistryEntry, AppError>> {
    const entry = this.store.get(id);
    if (!entry) return err(new RegistryEntryNotFoundError(String(id)));
    return ok(entry);
  }

  async updateEntry(id: RegistryEntryId, input: UpdateRegistryEntry): Promise<Result<RegistryEntry, AppError>> {
    const existing = this.store.get(id);
    if (!existing) return err(new RegistryEntryNotFoundError(String(id)));

    const parsed = UpdateRegistryEntrySchema.safeParse(input);
    if (!parsed.success) return err(new ValidationError({ message: parsed.error.message }));

    if (parsed.data.name && parsed.data.name.toLowerCase() !== existing.name.toLowerCase()) {
      if (this.byName.has(parsed.data.name.toLowerCase())) {
        return err(new DatasetConflictError(parsed.data.name));
      }
      this.byName.delete(existing.name.toLowerCase());
      this.byName.set(parsed.data.name.toLowerCase(), id);
    }

    const updated: RegistryEntry = {
      ...existing,
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.datasetId !== undefined ? { datasetId: datasetId(parsed.data.datasetId) } : {}),
      ...(parsed.data.format !== undefined ? { format: parsed.data.format } : {}),
      ...(parsed.data.connection !== undefined ? { connection: parsed.data.connection } : {}),
      ...(parsed.data.sizeBytes !== undefined ? { sizeBytes: parsed.data.sizeBytes } : {}),
      ...(parsed.data.rowCount !== undefined ? { rowCount: parsed.data.rowCount } : {}),
      ...(parsed.data.partitionKeys !== undefined ? { partitionKeys: parsed.data.partitionKeys } : {}),
      ...(parsed.data.checksum !== undefined ? { checksum: parsed.data.checksum } : {}),
      ...(parsed.data.refreshedAt !== undefined ? { refreshedAt: parsed.data.refreshedAt } : {}),
      updatedAt: new Date().toISOString(),
    };

    this.store.set(id, updated);
    return ok(updated);
  }

  async deregister(id: RegistryEntryId): Promise<Result<void, AppError>> {
    const existing = this.store.get(id);
    if (!existing) return err(new RegistryEntryNotFoundError(String(id)));
    this.store.delete(id);
    this.byName.delete(existing.name.toLowerCase());
    return ok(undefined);
  }

  async listEntries(): Promise<Result<ReadonlyArray<RegistryEntry>, AppError>> {
    return ok(Array.from(this.store.values()));
  }

  async findByDatasetId(dsId: DatasetId): Promise<Result<ReadonlyArray<RegistryEntry>, AppError>> {
    const entries = Array.from(this.store.values()).filter(e => e.datasetId === dsId);
    return ok(entries);
  }

  async findByName(name: string): Promise<Result<RegistryEntry | undefined, AppError>> {
    const id = this.byName.get(name.toLowerCase());
    if (!id) return ok(undefined);
    return ok(this.store.get(id));
  }
}
