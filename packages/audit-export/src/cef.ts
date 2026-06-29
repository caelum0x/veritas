// CEF format — serialises AuditEvent to ArcSight Common Event Format (CEF:0) strings.
import type { AuditEvent } from "./types.js";

const CEF_VERSION = "CEF:0";
const DEVICE_VENDOR = "Veritas";
const DEVICE_PRODUCT = "AuditExport";
const DEVICE_VERSION = "1.0";

/** Severity mapping from AuditOutcome to CEF severity 0–10. */
const OUTCOME_SEVERITY: Record<string, number> = {
  success: 3,
  failure: 6,
  denied: 8,
};

/** Escape CEF header field special characters (| and \). */
function escapeHeader(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

/** Escape CEF extension field value special characters (= and \). */
function escapeExtValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/=/g, "\\=").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

/** Render a record of extension key=value pairs into a CEF extension string. */
function buildExtension(pairs: Record<string, string | undefined>): string {
  return Object.entries(pairs)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${escapeExtValue(v as string)}`)
    .join(" ");
}

/**
 * Serialise an AuditEvent to a single-line CEF:0 string.
 * Specification: https://www.microfocus.com/documentation/arcsight/arcsight-smartconnectors/
 */
export function toCef(event: AuditEvent): string {
  const severity = OUTCOME_SEVERITY[event.outcome.toLowerCase()] ?? 5;
  const signatureId = escapeHeader(event.action);
  const name = escapeHeader(event.action);

  const header = [
    CEF_VERSION,
    escapeHeader(DEVICE_VENDOR),
    escapeHeader(DEVICE_PRODUCT),
    escapeHeader(DEVICE_VERSION),
    signatureId,
    name,
    String(severity),
  ].join("|");

  const ext = buildExtension({
    rt: String(new Date(event.timestamp).getTime()),
    src: event.actor.ip,
    suser: event.actor.id,
    act: event.action,
    outcome: event.outcome,
    resourceType: event.resource.type,
    resourceId: event.resource.id,
    auditId: event.id,
    actorType: event.actor.type,
    actorId: event.actor.id,
  });

  return `${header} ${ext}`.trimEnd();
}

/** Parse a raw CEF line back into its header fields (best-effort, for testing). */
export interface CefHeader {
  readonly version: string;
  readonly deviceVendor: string;
  readonly deviceProduct: string;
  readonly deviceVersion: string;
  readonly signatureId: string;
  readonly name: string;
  readonly severity: number;
}

export function parseCefHeader(line: string): CefHeader | null {
  const parts = line.split(/(?<!\\)\|/);
  if (parts.length < 7) return null;
  const [version, deviceVendor, deviceProduct, deviceVersion, signatureId, name, severityStr] =
    parts as [string, string, string, string, string, string, string];
  return {
    version,
    deviceVendor,
    deviceProduct,
    deviceVersion,
    signatureId,
    name,
    severity: parseInt(severityStr, 10),
  };
}
