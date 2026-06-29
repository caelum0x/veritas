// ReportIndexer — converts VerificationReport contracts into IndexedDocuments for search
import type { VerificationReport } from "@veritas/contracts";
import { makeIndexedDocument, type IndexedDocument } from "./document.js";

function collectClaimText(report: VerificationReport): string {
  if (!report.claims || report.claims.length === 0) return "";
  return report.claims
    .map((c) => [c.claim ?? "", c.verdict ?? ""].filter(Boolean).join(" "))
    .join(" ");
}

function collectVerdictLabel(report: VerificationReport): string {
  const counts = report.counts;
  if (!counts) return "";
  const entries = Object.entries(counts as Record<string, number>)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .sort(([, a], [, b]) => b - a);
  return entries[0]?.[0] ?? "";
}

export function reportToIndexedDocument(report: VerificationReport): IndexedDocument {
  const claimText = collectClaimText(report);
  const dominantVerdict = collectVerdictLabel(report);
  const claimCount = report.counts
    ? report.counts.supported + report.counts.refuted + report.counts.unverifiable
    : 0;

  // Use provenance.contentHash as a stable document id
  const docId = report.provenance.contentHash;

  const fields: Record<string, unknown> = {
    summary: report.summary ?? "",
    claimText,
    dominantVerdict,
    claimCount,
  };

  const meta: Record<string, unknown> = {
    reportId: docId,
    dominantVerdict,
    claimCount,
  };

  return makeIndexedDocument(
    docId,
    "verification-report",
    fields,
    meta,
    report.provenance.createdAt
  );
}

export function indexReports(reports: readonly VerificationReport[]): readonly IndexedDocument[] {
  return reports.map(reportToIndexedDocument);
}
