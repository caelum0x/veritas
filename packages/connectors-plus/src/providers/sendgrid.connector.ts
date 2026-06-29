// SendgridConnector: delivers outbound payloads as transactional email via the SendGrid v3 Mail Send API.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import type { ConnectorMeta } from "@veritas/connectors";
import type { OutboundPayload } from "@veritas/connectors";
import { ConnectorConfigError } from "@veritas/connectors";
import { AbstractConnector, BasePlusConfigSchema, doPost, assertOk } from "../base.js";

const SendgridConfigSchema = BasePlusConfigSchema.extend({
  /** SendGrid API key (SG.…). */
  apiKey: z.string().min(1),
  /** Verified sender email address. */
  fromEmail: z.string().email(),
  /** Optional sender display name. */
  fromName: z.string().optional(),
  /** Recipient email address. */
  toEmail: z.string().email(),
  /** Optional recipient display name. */
  toName: z.string().optional(),
  /** Optional subject prefix prepended to payload summary. */
  subjectPrefix: z.string().default("[Veritas]"),
});

type SendgridConfig = z.infer<typeof SendgridConfigSchema>;

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

const SEVERITY_LABEL: Record<string, string> = {
  info: "INFO",
  warning: "WARNING",
  error: "ERROR",
};

function buildHtmlBody(payload: OutboundPayload): string {
  const severityLabel = SEVERITY_LABEL[payload.severity] ?? payload.severity.toUpperCase();
  const rows = payload.fields
    ? Object.entries(payload.fields)
        .map(
          ([k, v]) =>
            `<tr><td style="font-weight:bold;padding:4px 8px;">${k}</td><td style="padding:4px 8px;">${String(v)}</td></tr>`,
        )
        .join("")
    : "";

  const fieldsTable =
    rows.length > 0
      ? `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">${rows}</table>`
      : "";

  const bodySection = payload.body
    ? `<p style="margin-top:12px;">${payload.body}</p>`
    : "";

  const sourceSection = payload.sourceUrl
    ? `<p style="margin-top:8px;font-size:12px;">Source: <a href="${payload.sourceUrl}">${payload.sourceUrl}</a></p>`
    : "";

  return `
<div style="font-family:sans-serif;max-width:600px;">
  <p><strong>Severity:</strong> ${severityLabel}</p>
  <p><strong>Event Type:</strong> ${payload.eventType}</p>
  <p><strong>Occurred At:</strong> ${payload.occurredAt}</p>
  ${bodySection}
  ${fieldsTable}
  ${sourceSection}
</div>`.trim();
}

function buildTextBody(payload: OutboundPayload): string {
  const lines: string[] = [
    `Severity: ${payload.severity.toUpperCase()}`,
    `Event Type: ${payload.eventType}`,
    `Occurred At: ${payload.occurredAt}`,
  ];
  if (payload.body) lines.push(`\n${payload.body}`);
  if (payload.fields) {
    lines.push("\nDetails:");
    for (const [k, v] of Object.entries(payload.fields)) {
      lines.push(`  ${k}: ${String(v)}`);
    }
  }
  if (payload.sourceUrl) lines.push(`\nSource: ${payload.sourceUrl}`);
  return lines.join("\n");
}

function buildMailPayload(
  payload: OutboundPayload,
  config: SendgridConfig,
): Record<string, unknown> {
  const subject = `${config.subjectPrefix} ${payload.summary}`.trim();

  const from: Record<string, string> = { email: config.fromEmail };
  if (config.fromName) from["name"] = config.fromName;

  const to: Record<string, string> = { email: config.toEmail };
  if (config.toName) to["name"] = config.toName;

  return {
    personalizations: [{ to: [to] }],
    from,
    subject,
    content: [
      { type: "text/plain", value: buildTextBody(payload) },
      { type: "text/html", value: buildHtmlBody(payload) },
    ],
  };
}

export class SendgridConnector extends AbstractConnector {
  readonly meta: ConnectorMeta;
  private readonly config: SendgridConfig;

  constructor(id: string, rawConfig: unknown) {
    super();
    const parsed = SendgridConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(id, `Invalid SendGrid config: ${parsed.error.message}`);
    }
    this.config = parsed.data;
    this.meta = { id, name: "SendGrid", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const headers = {
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    const body = buildMailPayload(payload, this.config);
    const result = await doPost(this.meta.id, SENDGRID_API, headers, body, this.config.timeoutMs);
    if (!result.ok) return result;

    return assertOk(this.meta.id, result.value, "SendGrid Mail Send API");
  }
}
