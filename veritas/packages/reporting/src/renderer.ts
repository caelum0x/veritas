// Renders a Report into one of the supported output formats (json, html, csv, markdown).
import type { Report, ReportSection } from "./report.js";

export interface RenderedReport {
  readonly reportId: string;
  readonly format: string;
  readonly content: string;
  readonly renderedAt: string;
}

function sectionToMarkdown(section: ReportSection): string {
  const lines: string[] = [`## ${section.title}\n`];
  const { content } = section;

  if (content.kind === "text" || content.kind === "summary") {
    lines.push(content.markdown);
  } else if (content.kind === "metric") {
    const { spec } = content;
    const trend = spec.trend ? ` (${spec.trend})` : "";
    lines.push(`**${spec.label}**: ${spec.value}${spec.unit ? " " + spec.unit : ""}${trend}`);
    if (spec.delta !== undefined) lines.push(`\nDelta: ${spec.delta}`);
  } else if (content.kind === "table") {
    const { spec } = content;
    if (spec.columns.length > 0) {
      lines.push(`| ${spec.columns.join(" | ")} |`);
      lines.push(`| ${spec.columns.map(() => "---").join(" | ")} |`);
      for (const row of spec.rows) {
        lines.push(`| ${spec.columns.map((c) => String(row[c] ?? "")).join(" | ")} |`);
      }
    }
  } else if (content.kind === "chart") {
    lines.push(`> Chart: ${content.spec.type} — ${content.spec.title}`);
    lines.push(`> X: ${content.spec.xAxis}, Y: ${content.spec.yAxis}`);
  } else if (content.kind === "provenance") {
    lines.push("**Sources:**");
    for (const src of content.sources) {
      lines.push(`- ${src}`);
    }
  }

  return lines.join("\n");
}

function sectionToHtml(section: ReportSection): string {
  const md = sectionToMarkdown(section);
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<section class="report-section" data-type="${section.type}"><pre>${escaped}</pre></section>`;
}

function tableSectionToCsv(section: ReportSection): string {
  if (section.content.kind !== "table") return "";
  const { columns, rows } = section.content.spec;
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function renderJson(report: Report): RenderedReport {
  return {
    reportId: report.id,
    format: "json",
    content: JSON.stringify(report, null, 2),
    renderedAt: new Date().toISOString(),
  };
}

export function renderMarkdown(report: Report): RenderedReport {
  const sorted = [...report.sections].sort((a, b) => a.order - b.order);
  const sections = sorted.map(sectionToMarkdown).join("\n\n---\n\n");
  const content = `# ${report.title}\n\n${report.description}\n\n${sections}`;
  return { reportId: report.id, format: "markdown", content, renderedAt: new Date().toISOString() };
}

export function renderHtml(report: Report): RenderedReport {
  const sorted = [...report.sections].sort((a, b) => a.order - b.order);
  const sections = sorted.map(sectionToHtml).join("\n");
  const content = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${report.title}</title></head>
<body>
<h1>${report.title}</h1>
<p>${report.description}</p>
${sections}
</body></html>`;
  return { reportId: report.id, format: "html", content, renderedAt: new Date().toISOString() };
}

export function renderCsv(report: Report): RenderedReport {
  const sorted = [...report.sections].sort((a, b) => a.order - b.order);
  const tables = sorted.filter((s) => s.content.kind === "table");
  const content = tables.map((s) => `## ${s.title}\n${tableSectionToCsv(s)}`).join("\n\n");
  return { reportId: report.id, format: "csv", content, renderedAt: new Date().toISOString() };
}

export function renderReport(report: Report): RenderedReport {
  switch (report.format) {
    case "json":     return renderJson(report);
    case "markdown": return renderMarkdown(report);
    case "html":     return renderHtml(report);
    case "csv":      return renderCsv(report);
    case "pdf":      return renderHtml(report); // PDF falls back to HTML for now
    default:         return renderJson(report);
  }
}
