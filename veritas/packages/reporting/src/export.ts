// Report export — serialise a rendered report into multiple output formats.
import { z } from "zod";
import { ReportFormatSchema } from "./template.js";
import type { SectionData } from "./section.js";

export type ReportFormat = z.infer<typeof ReportFormatSchema>;

export type RenderedReport = {
  readonly id: string;
  readonly title: string;
  readonly generatedAt: string;
  readonly format: ReportFormat;
  readonly sections: ReadonlyArray<RenderedSection>;
  readonly metadata: Record<string, unknown>;
};

export type RenderedSection = {
  readonly sectionId: string;
  readonly title?: string;
  readonly type: string;
  readonly data: SectionData;
};

export type ExportResult = {
  readonly format: ReportFormat;
  readonly content: string;
  readonly mimeType: string;
  readonly filename: string;
};

function toJson(report: RenderedReport): ExportResult {
  return {
    format: "json",
    content: JSON.stringify(report, null, 2),
    mimeType: "application/json",
    filename: `${report.id}.json`,
  };
}

function toCsv(report: RenderedReport): ExportResult {
  const lines: string[] = [];
  for (const section of report.sections) {
    if (section.type !== "table") continue;
    const rows = section.data.rows ?? [];
    if (rows.length === 0) continue;
    const firstRow = rows[0];
    if (!firstRow) continue;
    const keys = Object.keys(firstRow);
    if (lines.length > 0) lines.push("");
    if (section.title) lines.push(`# ${section.title}`);
    lines.push(keys.map(csvEscape).join(","));
    for (const row of rows) {
      lines.push(keys.map((k) => csvEscape(String(row[k] ?? ""))).join(","));
    }
  }
  return {
    format: "csv",
    content: lines.join("\n"),
    mimeType: "text/csv",
    filename: `${report.id}.csv`,
  };
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toMarkdown(report: RenderedReport): ExportResult {
  const lines: string[] = [`# ${report.title}`, `_Generated: ${report.generatedAt}_`, ""];
  for (const section of report.sections) {
    if (section.title) lines.push(`## ${section.title}`, "");
    if (section.type === "text" && section.data.text) {
      lines.push(section.data.text, "");
    } else if (section.type === "table") {
      const rows = section.data.rows ?? [];
      const firstMdRow = rows[0];
      if (rows.length > 0 && firstMdRow) {
        const keys = Object.keys(firstMdRow);
        lines.push(`| ${keys.join(" | ")} |`);
        lines.push(`| ${keys.map(() => "---").join(" | ")} |`);
        for (const row of rows) {
          lines.push(`| ${keys.map((k) => String(row[k] ?? "")).join(" | ")} |`);
        }
        lines.push("");
      }
    } else if (section.type === "metric") {
      const vals = section.data.metricValues ?? {};
      for (const [k, v] of Object.entries(vals)) {
        lines.push(`**${k}**: ${v}`);
      }
      lines.push("");
    }
  }
  return {
    format: "markdown",
    content: lines.join("\n"),
    mimeType: "text/markdown",
    filename: `${report.id}.md`,
  };
}

function toHtml(report: RenderedReport): ExportResult {
  const md = toMarkdown(report);
  const escaped = md.content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${report.title}</title></head><body><pre>${escaped}</pre></body></html>`;
  return {
    format: "html",
    content,
    mimeType: "text/html",
    filename: `${report.id}.html`,
  };
}

export function exportReport(report: RenderedReport, format: ReportFormat): ExportResult {
  switch (format) {
    case "json":
      return toJson(report);
    case "csv":
      return toCsv(report);
    case "markdown":
      return toMarkdown(report);
    case "html":
      return toHtml(report);
    case "pdf":
      // PDF generation requires native binaries; return HTML as a fallback carrier.
      return { ...toHtml(report), format: "pdf", mimeType: "application/pdf", filename: `${report.id}.pdf` };
    default:
      return toJson(report);
  }
}
