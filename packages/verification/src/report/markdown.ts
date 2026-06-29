// Render a VerificationReport as a Markdown document.

import type { VerificationReport, VerificationReportClaim, ReportCitation } from "@veritas/contracts";
import { buildSummary } from "./summary.js";

/** Escape pipe characters for safe embedding in Markdown tables. */
function escapePipe(text: string): string {
  return text.replace(/\|/g, "\\|");
}

/** Truncate long strings with ellipsis for table display. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

/** Render a single citation as a Markdown list item. */
function renderCitation(c: ReportCitation, index: number): string {
  const title = c.title != null ? c.title : c.url;
  const link = `[${title}](${c.url})`;
  const stance = c.supports ? "✓" : "✗";
  const quote = c.quote != null ? `\n   > ${c.quote}` : "";
  return `${index + 1}. ${stance} ${link}${quote}`;
}

/** Render an emoji badge for a verdict string. */
function verdictBadge(verdict: string): string {
  switch (verdict) {
    case "SUPPORTED":
      return "✅ SUPPORTED";
    case "REFUTED":
      return "❌ REFUTED";
    default:
      return "⚠️ UNVERIFIABLE";
  }
}

/** Render a single adjudicated claim section. */
function renderClaim(ac: VerificationReportClaim, index: number): string {
  const badge = verdictBadge(ac.verdict);
  const confidence = Math.round(ac.confidence * 100);
  const citationLines =
    ac.citations.length > 0
      ? ac.citations.map((c, i) => renderCitation(c, i)).join("\n")
      : "_No citations available._";

  return [
    `### Claim ${index + 1}`,
    ``,
    `> ${escapePipe(ac.claim)}`,
    ``,
    `**Verdict:** ${badge}  `,
    `**Confidence:** ${confidence}%`,
    ``,
    `**Reasoning:**`,
    ac.reasoning,
    ``,
    `**Sources:**`,
    citationLines,
    ``,
  ].join("\n");
}

/** Render the provenance section. */
function renderProvenance(report: VerificationReport): string {
  const p = report.provenance;
  const rows: Array<[string, string]> = [
    ["Verifier", p.verifier],
    ["Version", p.verifierVersion],
    ["Model", p.model],
    ["Effort", p.effort],
    ["Created At", p.createdAt],
    ["Claims", String(p.claimCount)],
    ["Sources", String(p.sourceCount)],
    ["Content Hash", truncate(p.contentHash, 20)],
  ];

  const tableRows = rows
    .map(([k, v]) => `| ${escapePipe(k)} | ${escapePipe(v)} |`)
    .join("\n");

  return [
    `## Provenance`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    tableRows,
    ``,
  ].join("\n");
}

/**
 * Render the given VerificationReport as a Markdown string.
 * The output is self-contained and suitable for embedding in a document,
 * displaying in a UI, or attaching as a report artifact.
 */
export function renderMarkdown(report: VerificationReport): string {
  const { trustScore, counts, claims } = report;
  const summary = buildSummary(report);

  const sections: string[] = [
    `# Verification Report`,
    ``,
    `**Trust Score:** ${trustScore}/100`,
    ``,
    summary,
    ``,
    `## Verdict Summary`,
    ``,
    `| Verdict | Count |`,
    `|---------|-------|`,
    `| ✅ Supported | ${counts.supported} |`,
    `| ❌ Refuted | ${counts.refuted} |`,
    `| ⚠️ Unverifiable | ${counts.unverifiable} |`,
    `| **Total** | **${claims.length}** |`,
    ``,
    `## Claims`,
    ``,
  ];

  if (claims.length === 0) {
    sections.push("_No claims were extracted from the submitted content._", ``);
  } else {
    for (let i = 0; i < claims.length; i++) {
      sections.push(renderClaim(claims[i]!, i));
    }
  }

  sections.push(renderProvenance(report));

  return sections.join("\n");
}
