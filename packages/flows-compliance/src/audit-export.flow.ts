// Audit-export flow: filter audit events by criteria then forward to SIEM or buffer.
import { type Result, ok, err, tryAsync, type Clock } from "@veritas/core";
import {
  type AuditEvent,
  type ExportFilter,
  type ExportFormat,
  type AuditExporter,
  type SiemAdapter,
} from "@veritas/audit-export";
import type { Logger } from "@veritas/observability";

export interface AuditEventQuerySource {
  queryEvents(filter: ExportFilter): Promise<readonly AuditEvent[]>;
}

export interface AuditExportFlowDeps {
  readonly eventSource: AuditEventQuerySource;
  readonly exporter: AuditExporter;
  readonly siemAdapter: SiemAdapter;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface AuditExportInput {
  readonly filter: ExportFilter;
  readonly format: ExportFormat;
  readonly sendToSiem: boolean;
  readonly limit?: number;
}

export interface AuditExportOutput {
  readonly eventsExported: number;
  readonly siemForwarded: number;
  readonly bytesWritten: number;
  readonly format: ExportFormat;
  readonly exportedAt: string;
}

export async function runAuditExportFlow(
  deps: AuditExportFlowDeps,
  input: AuditExportInput,
): Promise<Result<AuditExportOutput>> {
  const { eventSource, exporter, siemAdapter, clock, logger } = deps;
  const { filter, format, sendToSiem, limit } = input;

  logger.info("Audit export started", { format, sendToSiem });

  // Step 1: Query events from the audit store
  const queryResult = await tryAsync(() => eventSource.queryEvents(filter));
  if (!queryResult.ok) return err(queryResult.error);
  const allEvents = queryResult.value;
  const events = limit !== undefined ? allEvents.slice(0, limit) : allEvents;
  logger.info("Audit events retrieved", { count: events.length });

  if (events.length === 0) {
    const exportedAt = clock.nowIso();
    return ok({ eventsExported: 0, siemForwarded: 0, bytesWritten: 0, format, exportedAt });
  }

  // Step 2: Export to configured format (buffer / file)
  const exportResult = await exporter.export(events, { format, filter, limit });
  if (!exportResult.ok) return err(exportResult.error as Error);
  const exportSummary = exportResult.value;
  logger.info("Audit events exported", { eventsExported: exportSummary.eventsExported, bytesWritten: exportSummary.bytesWritten });

  // Step 3: Optionally forward to SIEM
  let siemForwarded = 0;
  if (sendToSiem) {
    const siemResult = await siemAdapter.sendBatch(events);
    if (!siemResult.ok) {
      logger.warn("SIEM forwarding failed", { error: String((siemResult as { ok: false; error: unknown }).error) });
    } else {
      siemForwarded = siemResult.value;
      logger.info("Audit events forwarded to SIEM", { count: siemForwarded });
    }
  }

  return ok({
    eventsExported: exportSummary.eventsExported,
    siemForwarded,
    bytesWritten: exportSummary.bytesWritten,
    format: exportSummary.format,
    exportedAt: exportSummary.exportedAt,
  });
}
