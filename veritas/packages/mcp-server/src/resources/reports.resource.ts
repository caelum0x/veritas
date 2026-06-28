// reports MCP resource — exposes stored verification reports as readable MCP resources.

import type { VerificationReport } from "@veritas/contracts";
import type {
  McpResource,
  McpResourceItem,
  McpResourceResult,
} from "../resource.js";

const MIME_TYPE = "application/json";
const URI_PREFIX = "veritas://reports/";

/** Mutable registry used to persist reports across tool calls. */
export type ReportRegistry = Map<string, VerificationReport>;

/** Create a new empty report registry shared between tools and this resource. */
export function createReportRegistry(): ReportRegistry {
  return new Map<string, VerificationReport>();
}

/** Register a report so it can be retrieved via get_report or the reports resource. */
export function registerReport(
  registry: ReportRegistry,
  reportId: string,
  report: VerificationReport,
): void {
  registry.set(reportId, report);
}

/** Build the reports MCP resource backed by the given registry. */
export function makeReportsResource(registry: ReportRegistry): McpResource {
  return {
    uriTemplate: `${URI_PREFIX}{id}`,
    name: "verification-reports",
    description:
      "Access verification reports generated during this session. Each report contains claim-level verdicts, trust scores, citations, and provenance metadata.",

    async list(): Promise<readonly McpResourceItem[]> {
      const items: McpResourceItem[] = [];
      for (const [id, report] of registry) {
        items.push({
          uri: `${URI_PREFIX}${id}`,
          name: `Report ${id}`,
          description: `Trust score ${report.trustScore}% — ${report.counts.supported} supported, ${report.counts.refuted} refuted, ${report.counts.unverifiable} unverifiable.`,
          mimeType: MIME_TYPE,
        });
      }
      return items;
    },

    async read(uri: string): Promise<McpResourceResult> {
      if (!uri.startsWith(URI_PREFIX)) {
        throw new Error(`Unsupported URI: "${uri}". Expected prefix "${URI_PREFIX}".`);
      }

      const id = uri.slice(URI_PREFIX.length);
      const report = registry.get(id);

      if (report === undefined) {
        throw new Error(`Report not found: no report with id "${id}" in this session.`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: MIME_TYPE,
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    },
  };
}
