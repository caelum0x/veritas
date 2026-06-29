// Public surface of @veritas/export — re-exports all module members
export type { Exporter } from "./exporter.js";
export type { ExportFormat } from "./format.js";
export type { ExportOptions, ExportResult, ExportTemplate, ExportRecord } from "./types.js";
export type { BrandingOptions } from "./branding.js";
export type { ExportTemplate as TemplateDefinition } from "./template.js";

export {
  ExportError,
  UnsupportedFormatError,
  ExporterNotFoundError,
  TemplateNotFoundError,
  SerializationError,
} from "./errors.js";

export { ExporterRegistry, createExporterRegistry } from "./registry.js";
