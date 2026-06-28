// Slack connector: delivers OutboundPayload to a Slack channel via incoming webhook.
import { ok, err, type Result } from "@veritas/core";
import type { Connector, ConnectorMeta } from "../connector.js";
import type { OutboundPayload } from "../payload.js";
import { ConnectorSendError, ConnectorConfigError } from "../errors.js";
import { SlackConnectorConfigSchema, type SlackConnectorConfig } from "../types.js";

const SEVERITY_COLOR: Record<string, string> = {
  info: "#36a64f",
  warning: "#ff9900",
  error: "#cc0000",
};

function buildAttachment(
  payload: OutboundPayload,
  config: SlackConnectorConfig,
): Record<string, unknown> {
  const fields = payload.fields
    ? Object.entries(payload.fields).map(([title, value]) => ({
        title,
        value: String(value),
        short: true,
      }))
    : [];

  return {
    color: SEVERITY_COLOR[payload.severity] ?? SEVERITY_COLOR["info"],
    fallback: payload.summary,
    title: payload.summary,
    title_link: payload.sourceUrl,
    text: payload.body,
    fields,
    footer: `Veritas · ${payload.eventType}`,
    ts: Math.floor(new Date(payload.occurredAt).getTime() / 1000),
  };
}

export class SlackConnector implements Connector {
  readonly meta: ConnectorMeta;
  private readonly config: SlackConnectorConfig;

  constructor(id: string, rawConfig: unknown) {
    const parsed = SlackConnectorConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(
        id,
        `Invalid Slack connector config: ${parsed.error.message}`,
      );
    }
    this.config = parsed.data;
    this.meta = { id, name: "Slack", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const body = JSON.stringify({
      username: this.config.username,
      icon_emoji: this.config.iconEmoji,
      ...(this.config.channel ? { channel: this.config.channel } : {}),
      attachments: [buildAttachment(payload, this.config)],
    });

    let response: Response;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        response = await fetch(this.config.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      return err(
        new ConnectorSendError(
          this.meta.id,
          `Slack request failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return err(
        new ConnectorSendError(
          this.meta.id,
          `Slack returned HTTP ${response.status}: ${text}`,
        ),
      );
    }

    return ok(undefined);
  }
}
