// syslog format — serialises AuditEvents to RFC-5424 compliant syslog messages.
import type { AuditEvent, ExportFilter } from "./types.js";
import { applyFilter } from "./filter.js";

/** RFC-5424 Facility codes. */
export const SyslogFacility = {
  KERN: 0,
  USER: 1,
  MAIL: 2,
  DAEMON: 3,
  AUTH: 4,
  SYSLOG: 5,
  LPR: 6,
  NEWS: 7,
  UUCP: 8,
  CRON: 9,
  AUTHPRIV: 10,
  FTP: 11,
  LOCAL0: 16,
  LOCAL1: 17,
  LOCAL2: 18,
  LOCAL3: 19,
  LOCAL4: 20,
  LOCAL5: 21,
  LOCAL6: 22,
  LOCAL7: 23,
} as const;
export type SyslogFacility = (typeof SyslogFacility)[keyof typeof SyslogFacility];

/** RFC-5424 Severity levels. */
export const SyslogSeverity = {
  EMERGENCY: 0,
  ALERT: 1,
  CRITICAL: 2,
  ERROR: 3,
  WARNING: 4,
  NOTICE: 5,
  INFORMATIONAL: 6,
  DEBUG: 7,
} as const;
export type SyslogSeverity = (typeof SyslogSeverity)[keyof typeof SyslogSeverity];

/** Outcome to RFC-5424 severity mapping. */
const OUTCOME_SEVERITY: Record<string, SyslogSeverity> = {
  success: SyslogSeverity.INFORMATIONAL,
  failure: SyslogSeverity.ERROR,
  denied: SyslogSeverity.WARNING,
};

/** Options for syslog serialisation. */
export interface SyslogOptions {
  readonly facility?: SyslogFacility;
  readonly hostname?: string;
  readonly appName?: string;
  readonly filter?: ExportFilter;
}

const NILVALUE = "-";

/** Sanitise a syslog PRINTUSASCII field (printable US-ASCII, no spaces). */
function sanitisePrintUs(value: string, maxLen: number): string {
  return value.replace(/[^\x21-\x7e]/g, "_").slice(0, maxLen);
}

/** Sanitise UTF-8 safe string fields (remove null bytes). */
function sanitiseUtf8(value: string): string {
  return value.replace(/\x00/g, "");
}

/**
 * Serialise a single AuditEvent to an RFC-5424 syslog message.
 * Format: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID [SD] MSG
 */
export function toSyslog(event: AuditEvent, options: SyslogOptions = {}): string {
  const {
    facility = SyslogFacility.AUTHPRIV,
    hostname = "veritas",
    appName = "audit-export",
  } = options;

  const severity = OUTCOME_SEVERITY[event.outcome.toLowerCase()] ?? SyslogSeverity.NOTICE;
  const pri = facility * 8 + severity;

  const timestamp = event.timestamp;
  const host = sanitisePrintUs(hostname, 255);
  const app = sanitisePrintUs(appName, 48);
  const procId = NILVALUE;
  const msgId = sanitisePrintUs(event.action, 32);

  // Structured data: one SD-ELEMENT with audit fields.
  const sdId = "audit@32473";
  const sdParams = [
    `id="${sanitiseUtf8(event.id)}"`,
    `actor="${sanitiseUtf8(event.actor.id)}"`,
    `actorType="${event.actor.type}"`,
    `outcome="${event.outcome}"`,
    `resourceType="${sanitiseUtf8(event.resource.type)}"`,
    `resourceId="${sanitiseUtf8(event.resource.id)}"`,
  ].join(" ");

  const sd = `[${sdId} ${sdParams}]`;
  const msg = sanitiseUtf8(event.action);

  return `<${pri}>1 ${timestamp} ${host} ${app} ${procId} ${msgId} ${sd} ${msg}`;
}

/**
 * Serialise an array of AuditEvents to newline-delimited syslog messages.
 * Returns a string with one message per line, ending with a trailing newline.
 */
export function toSyslogLines(events: readonly AuditEvent[], options: SyslogOptions = {}): string {
  const filtered = options.filter ? applyFilter(events, options.filter) : events;
  const lines = filtered.map((e) => toSyslog(e, options));
  return lines.join("\n") + (lines.length > 0 ? "\n" : "");
}
