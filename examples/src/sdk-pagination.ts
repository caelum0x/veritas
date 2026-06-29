// sdk-pagination.ts — iterate verification reports page by page using the SDK.
import { VeritasClient } from "@veritas/sdk/client.js";
import type { ApiPage, PageMeta } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";

const API_KEY = process.env["VERITAS_API_KEY"];

if (!API_KEY) {
  process.stderr.write("Error: VERITAS_API_KEY environment variable is not set.\n");
  process.exit(1);
}

const PAGE_SIZE = 10;
const MAX_PAGES = 5;

interface ReportSummary {
  id: string;
  verdict: string;
  claimCount: number;
  createdAt: string;
}

function summarizeReport(report: unknown): ReportSummary {
  const r = report as {
    id: string;
    verdict: string;
    claims?: unknown[];
    provenance?: { verifiedAt?: string };
    createdAt?: string;
  };
  return {
    id: r.id,
    verdict: r.verdict,
    claimCount: r.claims?.length ?? 0,
    createdAt: r.provenance?.verifiedAt ?? r.createdAt ?? "unknown",
  };
}

async function fetchAllReportsPaginated(client: VeritasClient): Promise<ReportSummary[]> {
  const collected: ReportSummary[] = [];
  let cursor: string | undefined = undefined;
  let pageNum = 0;

  do {
    pageNum++;
    process.stdout.write(`Fetching page ${pageNum}${cursor ? ` (cursor: ${cursor.slice(0, 12)}...)` : ""}...\n`);

    const page: ApiPage<VerificationReport> = await client.verification.list({
      limit: PAGE_SIZE,
      cursor,
    });

    const items = page.data ?? [];
    for (const item of items) {
      collected.push(summarizeReport(item));
    }

    process.stdout.write(`  Retrieved ${items.length} items (total so far: ${collected.length})\n`);

    const meta: PageMeta = page.meta;
    cursor = meta?.nextCursor ?? undefined;

    if (pageNum >= MAX_PAGES) {
      process.stdout.write(`Reached page limit (${MAX_PAGES}), stopping early.\n`);
      break;
    }
  } while (cursor != null);

  return collected;
}

async function main(): Promise<void> {
  const client = new VeritasClient({
    apiKey: API_KEY as string,
  });

  process.stdout.write(`Paginating reports (page_size=${PAGE_SIZE}, max_pages=${MAX_PAGES})...\n\n`);

  const startMs = Date.now();
  const allReports = await fetchAllReportsPaginated(client);
  const elapsedMs = Date.now() - startMs;

  process.stdout.write(`\nFetched ${allReports.length} reports in ${elapsedMs}ms\n\n`);

  if (allReports.length === 0) {
    process.stdout.write("No reports found.\n");
    return;
  }

  const verdictCounts: Record<string, number> = {};
  for (const report of allReports) {
    verdictCounts[report.verdict] = (verdictCounts[report.verdict] ?? 0) + 1;
  }

  process.stdout.write("Verdict distribution:\n");
  for (const [verdict, count] of Object.entries(verdictCounts)) {
    const pct = Math.round((count / allReports.length) * 100);
    process.stdout.write(`  ${verdict.padEnd(16)}: ${count} (${pct}%)\n`);
  }

  process.stdout.write("\nFirst 5 reports:\n");
  for (const report of allReports.slice(0, 5)) {
    process.stdout.write(
      `  ${report.id} | ${report.verdict.padEnd(14)} | ${report.claimCount} claims | ${report.createdAt}\n`,
    );
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Unhandled error: ${msg}\n`);
  process.exit(1);
});
