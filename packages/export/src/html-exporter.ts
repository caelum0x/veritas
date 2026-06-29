// HTML exporter — renders export data as a styled, responsive HTML document
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Exporter } from "./exporter.js";
import type { ExportFormat } from "./format.js";
import type { ExportOptions, ExportResult } from "./types.js";
import { resolveBranding, cssVariables } from "./branding.js";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderValue(value: unknown, depth = 0): string {
  if (value === null || value === undefined) {
    return `<span class="null">null</span>`;
  }
  if (typeof value === "boolean") {
    return `<span class="bool">${value}</span>`;
  }
  if (typeof value === "number") {
    return `<span class="num">${value}</span>`;
  }
  if (typeof value === "string") {
    return `<span class="str">${escapeHtml(value)}</span>`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `<span class="empty">[]</span>`;
    const items = value
      .map((item) => `<li>${renderValue(item, depth + 1)}</li>`)
      .join("");
    return `<ul class="array depth-${depth}">${items}</ul>`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `<span class="empty">{}</span>`;
    const rows = entries
      .map(
        ([k, v]) =>
          `<tr><th class="key">${escapeHtml(k)}</th><td class="val">${renderValue(v, depth + 1)}</td></tr>`
      )
      .join("");
    return `<table class="obj depth-${depth}"><tbody>${rows}</tbody></table>`;
  }
  return escapeHtml(value);
}

function buildHtml(
  data: unknown,
  options: ExportOptions,
  exportedAt: string
): string {
  const branding = resolveBranding(options.branding);
  const vars = cssVariables(branding);
  const title = escapeHtml(options.title ?? "Export");
  const description = options.description ? `<p class="desc">${escapeHtml(options.description)}</p>` : "";
  const body = renderValue(data);
  const footer = branding.footerText
    ? `<footer><p>${escapeHtml(branding.footerText)}</p></footer>`
    : "";
  const metaBlock =
    options.includeMetadata !== false
      ? `<div class="meta"><span>Exported: ${escapeHtml(exportedAt)}</span>${branding.websiteUrl ? ` · <a href="${escapeHtml(branding.websiteUrl)}">${escapeHtml(branding.organizationName)}</a>` : ""}</div>`
      : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(options.locale ?? "en")}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title} — ${escapeHtml(branding.organizationName)}</title>
  <style>
    :root { ${vars} }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-family); color: #111; background: #f9fafb; padding: 2rem; }
    header { background: var(--color-primary); color: #fff; padding: 1.5rem 2rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem; }
    header img { height: 40px; }
    header h1 { font-size: 1.5rem; font-weight: 700; }
    .desc { color: #555; margin-bottom: 1.25rem; }
    .meta { font-size: 0.78rem; color: #888; margin-bottom: 1.25rem; }
    .meta a { color: var(--color-primary); text-decoration: none; }
    .content { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; }
    table.obj { border-collapse: collapse; width: 100%; margin: 0.25rem 0; }
    table.obj th.key { text-align: left; padding: 0.35rem 0.6rem; font-weight: 600; color: #374151; width: 30%; background: var(--color-secondary); }
    table.obj td.val { padding: 0.35rem 0.6rem; vertical-align: top; }
    table.obj tr:nth-child(even) td { background: #f9fafb; }
    ul.array { list-style: disc; padding-left: 1.25rem; }
    ul.array li { padding: 0.15rem 0; }
    span.null, span.empty { color: #9ca3af; font-style: italic; }
    span.bool { color: #7c3aed; }
    span.num { color: #0369a1; }
    span.str { color: #065f46; }
    footer { margin-top: 2rem; text-align: center; font-size: 0.78rem; color: #9ca3af; }
  </style>
</head>
<body>
  <header>
    ${branding.logoUrl ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.organizationName)} logo"/>` : ""}
    <h1>${title}</h1>
  </header>
  ${description}
  ${metaBlock}
  <div class="content">${body}</div>
  ${footer}
</body>
</html>`;
}

export class HtmlExporter implements Exporter {
  readonly format: ExportFormat = "html";

  async export(data: unknown, options: ExportOptions): Promise<Result<ExportResult>> {
    try {
      const exportedAt = new Date().toISOString();
      const content = buildHtml(data, options, exportedAt);
      const bytes = Buffer.from(content, "utf-8");
      return ok({
        format: this.format,
        mimeType: "text/html",
        filename: options.filename ?? "export.html",
        content: bytes,
        byteSize: bytes.byteLength,
        exportedAt,
      });
    } catch (e) {
      return err(e);
    }
  }
}
