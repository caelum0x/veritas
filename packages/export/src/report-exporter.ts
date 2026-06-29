// Verification report exporter — renders VerificationReport into any supported format
import { ok, err, isOk } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import type { Exporter } from "./exporter.js";
import type { ExportFormat } from "./format.js";
import type { ExportOptions, ExportResult } from "./types.js";
import { resolveBranding } from "./branding.js";

/** Builds a Markdown representation of a VerificationReport. */
function reportToMarkdown(report: VerificationReport, orgName: string, exportedAt: string): string {
  const verdictBadge = (v: string): string => {
    const map: Record<string, string> = {
      supported: "✅ Supported",
      refuted: "❌ Refuted",
      unverifiable: "⚠️ Unverifiable",
    };
    return map[v] ?? v;
  };

  const claimSections = report.claims
    .map((c, i) => {
      const citations = c.citations
        .map((cit) => {
          const label = cit.title ?? cit.url;
          const stance = cit.supports ? "supports" : "contradicts";
          const quote = cit.quote ? `\n  > "${cit.quote}"` : "";
          return `  - [${label}](${cit.url}) — ${stance}${quote}`;
        })
        .join("\n");
      return [
        `### ${i + 1}. ${c.claim}`,
        ``,
        `**Verdict:** ${verdictBadge(c.verdict)}  `,
        `**Confidence:** ${Math.round(c.confidence * 100)}%`,
        ``,
        c.reasoning,
        citations ? `\n**Sources:**\n${citations}` : "",
      ]
        .filter((l) => l !== "")
        .join("\n");
    })
    .join("\n\n---\n\n");

  return [
    `# Verification Report`,
    ``,
    `**Organization:** ${orgName}  `,
    `**Exported:** ${exportedAt}  `,
    `**Trust Score:** ${report.trustScore}/100`,
    ``,
    `## Summary`,
    ``,
    report.summary,
    ``,
    `## Verdict Counts`,
    ``,
    `| Supported | Refuted | Unverifiable |`,
    `|-----------|---------|--------------|`,
    `| ${report.counts.supported} | ${report.counts.refuted} | ${report.counts.unverifiable} |`,
    ``,
    `## Claims`,
    ``,
    claimSections,
    ``,
    `---`,
    ``,
    `## Provenance`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    ...Object.entries(report.provenance).map(([k, v]) => `| ${k} | ${v} |`),
  ].join("\n");
}

/** Builds an HTML representation of a VerificationReport. */
function reportToHtml(
  report: VerificationReport,
  options: ExportOptions,
  exportedAt: string
): string {
  const branding = resolveBranding(options.branding);
  const esc = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const verdictClass = (v: string) =>
    ({ supported: "verdict-supported", refuted: "verdict-refuted", unverifiable: "verdict-unverifiable" }[v] ?? "");

  const claimsHtml = report.claims
    .map((c, i) => {
      const citHtml = c.citations.length
        ? `<ul class="citations">${c.citations
            .map(
              (cit) =>
                `<li class="${cit.supports ? "supports" : "contradicts"}"><a href="${esc(cit.url)}" target="_blank" rel="noopener">${esc(cit.title ?? cit.url)}</a>${cit.quote ? ` — <q>${esc(cit.quote)}</q>` : ""}</li>`
            )
            .join("")}</ul>`
        : "";
      return `<div class="claim">
  <h3>${i + 1}. ${esc(c.claim)}</h3>
  <span class="verdict ${verdictClass(c.verdict)}">${esc(c.verdict)}</span>
  <span class="confidence">${Math.round(c.confidence * 100)}% confidence</span>
  <p class="reasoning">${esc(c.reasoning)}</p>
  ${citHtml}
</div>`;
    })
    .join("\n");

  const provRows = Object.entries(report.provenance)
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Verification Report — ${esc(branding.organizationName)}</title>
  <style>
    :root{--primary:${branding.primaryColor};--secondary:${branding.secondaryColor};}
    body{font-family:${branding.fontFamily};margin:0;background:#f9fafb;color:#111;}
    .container{max-width:860px;margin:2rem auto;padding:0 1rem;}
    header{background:var(--primary);color:#fff;padding:1.5rem 2rem;border-radius:8px;margin-bottom:1.5rem;}
    header h1{margin:0;font-size:1.6rem;}
    header .sub{opacity:.8;font-size:.9rem;margin-top:.25rem;}
    .score-badge{display:inline-block;background:#fff;color:var(--primary);font-weight:700;font-size:1.4rem;padding:.5rem 1rem;border-radius:6px;margin-top:.75rem;}
    .counts{display:flex;gap:1rem;margin-bottom:1.5rem;}
    .count-box{flex:1;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:1rem;text-align:center;}
    .count-box .n{font-size:2rem;font-weight:700;}
    .count-box.sup .n{color:#059669;}.count-box.ref .n{color:#dc2626;}.count-box.unv .n{color:#d97706;}
    .summary{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem;}
    .claim{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:1.25rem;margin-bottom:1rem;}
    .claim h3{margin:0 0 .5rem;}
    .verdict{display:inline-block;font-size:.75rem;font-weight:700;text-transform:uppercase;padding:.2rem .55rem;border-radius:4px;margin-right:.5rem;}
    .verdict-supported{background:#d1fae5;color:#065f46;}
    .verdict-refuted{background:#fee2e2;color:#991b1b;}
    .verdict-unverifiable{background:#fef3c7;color:#92400e;}
    .confidence{font-size:.8rem;color:#6b7280;}
    .reasoning{margin:.75rem 0 .5rem;color:#374151;}
    .citations{margin:.25rem 0 0 0;padding-left:1.25rem;font-size:.85rem;}
    .citations li.supports{color:#065f46;}.citations li.contradicts{color:#991b1b;}
    .citations a{color:inherit;}
    .provenance{background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-top:1.5rem;}
    .provenance table{width:100%;border-collapse:collapse;font-size:.85rem;}
    .provenance th{text-align:left;padding:.5rem .75rem;background:var(--secondary);width:35%;}
    .provenance td{padding:.5rem .75rem;border-top:1px solid #e5e7eb;word-break:break-all;}
    footer{text-align:center;font-size:.75rem;color:#9ca3af;margin-top:2rem;}
  </style>
</head>
<body>
<div class="container">
  <header>
    <h1>Verification Report</h1>
    <div class="sub">${esc(branding.organizationName)} · ${esc(exportedAt)}</div>
    <div class="score-badge">Trust Score: ${esc(report.trustScore)}/100</div>
  </header>
  <div class="counts">
    <div class="count-box sup"><div class="n">${esc(report.counts.supported)}</div><div>Supported</div></div>
    <div class="count-box ref"><div class="n">${esc(report.counts.refuted)}</div><div>Refuted</div></div>
    <div class="count-box unv"><div class="n">${esc(report.counts.unverifiable)}</div><div>Unverifiable</div></div>
  </div>
  <div class="summary"><strong>Summary</strong><p>${esc(report.summary)}</p></div>
  <h2>Claims</h2>
  ${claimsHtml}
  <div class="provenance"><table>${provRows}</table></div>
  ${branding.footerText ? `<footer>${esc(branding.footerText)}</footer>` : ""}
</div>
</body>
</html>`;
}

/** Converts a VerificationReport to a flat JSON structure suitable for export. */
function reportToJson(report: VerificationReport): unknown {
  return report;
}

/** Flattens claims into CSV rows for tabular analysis. */
function reportToCsvRows(report: VerificationReport): Record<string, unknown>[] {
  return report.claims.map((c) => ({
    claim: c.claim,
    verdict: c.verdict,
    confidence: c.confidence,
    reasoning: c.reasoning,
    citationCount: c.citations.length,
    supportingCitations: c.citations.filter((x) => x.supports).length,
    contradictingCitations: c.citations.filter((x) => !x.supports).length,
    trustScore: report.trustScore,
    exportedProvenance: report.provenance.contentHash,
  }));
}

/**
 * High-level helper: given a VerificationReport and an Exporter, produces an ExportResult.
 * Supports json, csv, markdown, html, and pdf formats.
 */
export async function exportReport(
  report: VerificationReport,
  exporter: Exporter,
  options: ExportOptions
): Promise<Result<ExportResult>> {
  const branding = resolveBranding(options.branding);
  const exportedAt = new Date().toISOString();

  const format: ExportFormat = options.format;

  try {
    if (format === "html") {
      const content = reportToHtml(report, options, exportedAt);
      const bytes = Buffer.from(content, "utf-8");
      return ok({
        format,
        mimeType: "text/html",
        filename: options.filename ?? "verification-report.html",
        content: bytes,
        byteSize: bytes.byteLength,
        exportedAt,
      });
    }

    if (format === "markdown") {
      const content = reportToMarkdown(report, branding.organizationName, exportedAt);
      const bytes = Buffer.from(content, "utf-8");
      return ok({
        format,
        mimeType: "text/markdown",
        filename: options.filename ?? "verification-report.md",
        content: bytes,
        byteSize: bytes.byteLength,
        exportedAt,
      });
    }

    if (format === "csv") {
      const rows = reportToCsvRows(report);
      return exporter.export(rows, options);
    }

    // json and pdf fall through to the registered exporter
    const payload = format === "pdf" ? reportToHtml(report, options, exportedAt) : reportToJson(report);
    return exporter.export(payload, { ...options, filename: options.filename ?? `verification-report.${format}` });
  } catch (e) {
    return err(e);
  }
}

/** Typed wrapper for report export that validates and delegates. */
export class ReportExporter implements Exporter {
  readonly format: ExportFormat;
  private readonly delegate: Exporter;

  constructor(delegate: Exporter) {
    this.delegate = delegate;
    this.format = delegate.format;
  }

  async export(data: unknown, options: ExportOptions): Promise<Result<ExportResult>> {
    try {
      const { VerificationReportSchema } = await import("@veritas/contracts");
      const parsed = VerificationReportSchema.safeParse(data);
      if (!parsed.success) {
        return this.delegate.export(data, options);
      }
      return exportReport(parsed.data, this.delegate, options);
    } catch (e) {
      return err(e);
    }
  }
}
