// Shared types for the export module — options, results, and metadata
import type { ExportFormat } from "./format.js";
import type { BrandingOptions } from "./branding.js";

export interface ExportOptions {
  readonly format: ExportFormat;
  readonly branding?: BrandingOptions;
  readonly title?: string;
  readonly description?: string;
  readonly filename?: string;
  readonly pretty?: boolean;
  readonly includeMetadata?: boolean;
  readonly locale?: string;
  readonly timezone?: string;
}

export interface ExportResult {
  readonly content: string | Uint8Array;
  readonly mimeType: string;
  readonly filename: string;
  readonly format: ExportFormat;
  readonly byteSize: number;
  readonly exportedAt: string;
}

export interface ExportTemplate {
  readonly id: string;
  readonly name: string;
  readonly format: ExportFormat;
  readonly defaultOptions: Partial<ExportOptions>;
}

export interface ExportRecord {
  readonly id: string;
  readonly format: ExportFormat;
  readonly filename: string;
  readonly byteSize: number;
  readonly exportedAt: string;
  readonly options: ExportOptions;
}
