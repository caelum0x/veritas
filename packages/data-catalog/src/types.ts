// Shared type aliases and branded primitives for the data-catalog module.
import { Brand, brand } from "@veritas/core";

export type DatasetId = Brand<string, "DatasetId">;
export type TagId = Brand<string, "TagId">;
export type OwnerId = Brand<string, "OwnerId">;
export type GlossaryTermId = Brand<string, "GlossaryTermId">;

export const datasetId = (v: string): DatasetId => brand<string, "DatasetId">(v);
export const tagId = (v: string): TagId => brand<string, "TagId">(v);
export const ownerId = (v: string): OwnerId => brand<string, "OwnerId">(v);
export const glossaryTermId = (v: string): GlossaryTermId => brand<string, "GlossaryTermId">(v);

export type DataFormat = "csv" | "json" | "parquet" | "avro" | "orc" | "tsv" | "ndjson";
export type DatasetStatus = "active" | "deprecated" | "draft" | "archived";
export type SchemaFieldType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "timestamp"
  | "date"
  | "bytes"
  | "object"
  | "array"
  | "null";

export interface SchemaField {
  readonly name: string;
  readonly type: SchemaFieldType;
  readonly nullable: boolean;
  readonly description?: string;
  readonly tags?: readonly string[];
}

export interface DatasetSchema {
  readonly version: number;
  readonly fields: readonly SchemaField[];
  readonly primaryKey?: readonly string[];
  readonly description?: string;
}

export interface Dataset {
  readonly id: DatasetId;
  readonly name: string;
  readonly description: string;
  readonly format: DataFormat;
  readonly status: DatasetStatus;
  readonly ownerId: OwnerId;
  readonly schema: DatasetSchema;
  readonly tags: readonly TagId[];
  readonly location: string;
  readonly rowCount?: number;
  readonly sizeBytes?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateDataset {
  readonly name: string;
  readonly description: string;
  readonly format: DataFormat;
  readonly status?: DatasetStatus;
  readonly ownerId: OwnerId;
  readonly schema: DatasetSchema;
  readonly tags?: readonly TagId[];
  readonly location: string;
  readonly rowCount?: number;
  readonly sizeBytes?: number;
}

export interface UpdateDataset {
  readonly name?: string;
  readonly description?: string;
  readonly format?: DataFormat;
  readonly status?: DatasetStatus;
  readonly ownerId?: OwnerId;
  readonly schema?: DatasetSchema;
  readonly tags?: readonly TagId[];
  readonly location?: string;
  readonly rowCount?: number;
  readonly sizeBytes?: number;
}

export interface Tag {
  readonly id: TagId;
  readonly name: string;
  readonly color?: string;
  readonly description?: string;
  readonly createdAt: string;
}

export interface CreateTag {
  readonly name: string;
  readonly color?: string;
  readonly description?: string;
}

export interface Owner {
  readonly id: OwnerId;
  readonly name: string;
  readonly email: string;
  readonly team?: string;
  readonly createdAt: string;
}

export interface CreateOwner {
  readonly name: string;
  readonly email: string;
  readonly team?: string;
}

export interface GlossaryTerm {
  readonly id: GlossaryTermId;
  readonly term: string;
  readonly definition: string;
  readonly examples?: readonly string[];
  readonly relatedTerms?: readonly GlossaryTermId[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateGlossaryTerm {
  readonly term: string;
  readonly definition: string;
  readonly examples?: readonly string[];
  readonly relatedTerms?: readonly GlossaryTermId[];
}

export interface CatalogSearchQuery {
  readonly q?: string;
  readonly tags?: readonly TagId[];
  readonly ownerId?: OwnerId;
  readonly format?: DataFormat;
  readonly status?: DatasetStatus;
  readonly limit?: number;
  readonly offset?: number;
}

export interface CatalogSearchResult {
  readonly datasets: readonly Dataset[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}
