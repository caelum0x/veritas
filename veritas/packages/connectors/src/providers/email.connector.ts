// Email connector: models an SMTP/email gateway behind a port interface with a console implementation.
import { ok, err, type Result } from "@veritas/core";
import type { Connector, ConnectorMeta } from "../connector.js";
import type { OutboundPayload } from "../payload.js";
import { ConnectorSendError } from "../errors.js";

/** Port interface for an email sender — swap console implementation for real SMTP at runtime. */
export interface EmailSenderPort {
  send(message: EmailMessage): Promise<void>;
}

export interface EmailMessage {
  readonly to: readonly string[];
  readonly from: string;
  readonly subject: string;
  readonly textBody: string;
  readonly htmlBody?: string;
}

/** Console-backed implementation (development / testing). */
export class ConsoleEmailSender implements EmailSenderPort {
  async send(message: EmailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log("[EmailConnector] would send email:", JSON.stringify(message, null, 2));
  }
}

export interface EmailConnectorConfig {
  readonly connectorId: string;
  readonly from: string;
  readonly to: readonly string[];
  readonly sender?: EmailSenderPort;
}

function buildSubject(payload: OutboundPayload): string {
  const prefix = payload.severity === "error" ? "ERROR" : payload.severity === "warning" ? "WARN" : "INFO";
  return `[Veritas][${prefix}] ${payload.summary}`;
}

function buildTextBody(payload: OutboundPayload): string {
  const lines = [payload.summary, "", `Event: ${payload.eventType}`, `Time:  ${payload.occurredAt}`];
  if (payload.body) lines.push("", payload.body);
  if (payload.fields && Object.keys(payload.fields).length > 0) {
    lines.push("", "--- Fields ---");
    for (const [k, v] of Object.entries(payload.fields)) {
      lines.push(`  ${k}: ${String(v)}`);
    }
  }
  if (payload.sourceUrl) lines.push("", `Source: ${payload.sourceUrl}`);
  lines.push("", `Delivery ID: ${payload.deliveryId}`);
  return lines.join("\n");
}

function buildHtmlBody(payload: OutboundPayload): string {
  const severityColor =
    payload.severity === "error" ? "#c0392b" : payload.severity === "warning" ? "#e67e22" : "#2980b9";

  const fieldRows =
    payload.fields && Object.keys(payload.fields).length > 0
      ? `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse">
          <tr><th>Field</th><th>Value</th></tr>
          ${Object.entries(payload.fields)
            .map(([k, v]) => `<tr><td>${k}</td><td>${String(v)}</td></tr>`)
            .join("")}
        </table>`
      : "";

  const sourceLink = payload.sourceUrl
    ? `<p><a href="${payload.sourceUrl}">View full context</a></p>`
    : "";

  return `<!DOCTYPE html><html><body>
<h2 style="color:${severityColor}">[${payload.severity.toUpperCase()}] ${payload.summary}</h2>
<p><strong>Event:</strong> ${payload.eventType} &mdash; <em>${payload.occurredAt}</em></p>
${payload.body ? `<p>${payload.body.replace(/\n/g, "<br>")}</p>` : ""}
${fieldRows}
${sourceLink}
<p style="color:#888;font-size:0.8em">Delivery ID: ${payload.deliveryId}</p>
</body></html>`;
}

export class EmailConnector implements Connector {
  readonly meta: ConnectorMeta;
  private readonly config: EmailConnectorConfig;
  private readonly sender: EmailSenderPort;

  constructor(config: EmailConnectorConfig) {
    this.config = config;
    this.sender = config.sender ?? new ConsoleEmailSender();
    this.meta = { id: config.connectorId, name: "Email", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const message: EmailMessage = {
      to: this.config.to,
      from: this.config.from,
      subject: buildSubject(payload),
      textBody: buildTextBody(payload),
      htmlBody: buildHtmlBody(payload),
    };

    try {
      await this.sender.send(message);
    } catch (cause) {
      return err(new ConnectorSendError(this.meta.id, "Email send failed", { cause }));
    }

    return ok(undefined);
  }
}
