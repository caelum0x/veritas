// Markdown exporter — renders export data as a human-readable Markdown document
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Exporter } from "./exporter.js";
import type { ExportFormat } from "./format.js";
import type { ExportOptions, ExportResult } from "./types.js";

function valueToMd(value: unknown, depth: number): string {
  if (value === null || value === undefined) return "_null_";
  if (typeof value === "boolean") return value ? "✓" : "✗";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return "_empty list_";
    return value.map((v) => `- ${valueToMd(v, depth + 1)}`).join("\n");
  }
  if (typeof value === "object") {
    return objectToMd(value as Record<string, unknown>, depth + 1);
  }
  return String(value);
}

function objectToMd(obj: Record<string, unknown>, depth: number): string {
  const heading = "#".repeat(Math.min(depth + 1, 6));
  return Object.entries(obj)
    .map(([key, val]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        return `${heading} ${label}\n\n${objectToMd(val as Record<string, unknown>, depth + 1)}`;
      }
      return `**${label}:** ${valueToMd(val, depth)}`;
    })
    .join("\n\n");
}

function buildDocument(data: unknown, title: string): string {
  const lines: string[] = [`# ${title}`, ""];
  const items = Array.isArray(data) ? data : [data];
  items.forEach((item, i) => {
    if (items.length > 1) lines.push(`## Item ${i + 1}`, "");
    if (typeof item === "object" && item !== null) {
      lines.push(objectToMd(item as Record<string, unknown>, 1));
    } else {
      lines.push(valueToMd(item, 0));
    }
    lines.push("");
  });
  return lines.join("\n");
}

export class MarkdownExporter implements Exporter {
  readonly format: ExportFormat = "markdown";

  async export(data: unknown, options: ExportOptions): Promise<Result<ExportResult>> {
    try {
      const title = options.title ?? "Export";
      const content = buildDocument(data, title);
      const bytes = Buffer.from(content, "utf-8");
      return ok({
        format: this.format,
        mimeType: "text/markdown",
        filename: options.filename ?? "export.md",
        content: bytes,
        byteSize: bytes.byteLength,
        exportedAt: new Date().toISOString(),
      });
    } catch (e) {
      return err(e);
    }
  }
}
