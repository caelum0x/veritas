// PDF exporter — port interface with an HTML-to-text fallback implementation
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Exporter } from "./exporter.js";
import type { ExportFormat } from "./format.js";
import type { ExportOptions, ExportResult } from "./types.js";
import { resolveBranding } from "./branding.js";

/** Port: real implementations (Puppeteer, wkhtmltopdf) plug in here. */
export interface PdfRenderer {
  render(html: string, options: PdfRenderOptions): Promise<Uint8Array>;
}

export interface PdfRenderOptions {
  readonly title: string;
  readonly landscape?: boolean;
  readonly marginMm?: number;
}

/** Minimal plain-text PDF that satisfies the PDF header signature for testing. */
class ConsolePdfRenderer implements PdfRenderer {
  async render(html: string, options: PdfRenderOptions): Promise<Uint8Array> {
    // Strip HTML tags for a plain-text simulation; real renderer would call headless browser
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
    const body = [
      `%PDF-1.4`,
      `% Veritas PDF export — title: ${options.title}`,
      `% Generated: ${new Date().toISOString()}`,
      ``,
      text.slice(0, 4000),
      `%%EOF`,
    ].join("\n");
    return new TextEncoder().encode(body);
  }
}

const DEFAULT_RENDERER: PdfRenderer = new ConsolePdfRenderer();

export class PdfExporter implements Exporter {
  readonly format: ExportFormat = "pdf";
  private readonly renderer: PdfRenderer;

  constructor(renderer: PdfRenderer = DEFAULT_RENDERER) {
    this.renderer = renderer;
  }

  async export(data: unknown, options: ExportOptions): Promise<Result<ExportResult>> {
    try {
      const branding = resolveBranding(options.branding);
      const title = options.title ?? "Export";
      const exportedAt = new Date().toISOString();

      const html = buildPdfHtml(data, title, branding.organizationName, exportedAt, options);
      const bytes = await this.renderer.render(html, { title });
      return ok({
        format: this.format,
        mimeType: "application/pdf",
        filename: options.filename ?? "export.pdf",
        content: bytes,
        byteSize: bytes.byteLength,
        exportedAt,
      });
    } catch (e) {
      return err(e);
    }
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function jsonToTable(data: unknown): string {
  const records = Array.isArray(data) ? data : [data];
  if (records.length === 0) return "<p>No data</p>";
  const first = records[0];
  if (typeof first !== "object" || first === null) {
    return `<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
  }
  const keys = Array.from(new Set(records.flatMap((r) => Object.keys(r as object))));
  const header = keys.map((k) => `<th>${escapeHtml(k)}</th>`).join("");
  const rows = records.map((r) => {
    const rec = r as Record<string, unknown>;
    const cells = keys
      .map((k) => `<td>${escapeHtml(JSON.stringify(rec[k]) ?? "")}</td>`)
      .join("");
    return `<tr>${cells}</tr>`;
  });
  return `<table><thead><tr>${header}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function buildPdfHtml(
  data: unknown,
  title: string,
  orgName: string,
  exportedAt: string,
  options: ExportOptions
): string {
  const description = options.description
    ? `<p class="desc">${escapeHtml(options.description)}</p>`
    : "";
  const metaLine =
    options.includeMetadata !== false
      ? `<p class="meta">Exported ${escapeHtml(exportedAt)} by ${escapeHtml(orgName)}</p>`
      : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body { font-family: serif; font-size: 11pt; color: #111; margin: 2cm; }
  h1 { font-size: 18pt; margin-bottom: 0.4cm; }
  .desc { color: #555; margin-bottom: 0.3cm; }
  .meta { font-size: 8pt; color: #888; margin-bottom: 0.5cm; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.5cm; font-size: 9pt; }
  th { background: #1a56db; color: #fff; padding: 4px 8px; text-align: left; }
  td { border: 1px solid #d1d5db; padding: 4px 8px; }
  tr:nth-child(even) td { background: #f9fafb; }
  pre { white-space: pre-wrap; font-size: 9pt; }
</style>
</head><body>
<h1>${escapeHtml(title)}</h1>
${description}
${metaLine}
${jsonToTable(data)}
</body></html>`;
}
