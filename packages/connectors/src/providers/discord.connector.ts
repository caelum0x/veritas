// Discord connector: delivers OutboundPayload to a Discord channel via webhook.
import { ok, err, type Result } from "@veritas/core";
import type { Connector, ConnectorMeta } from "../connector.js";
import type { OutboundPayload } from "../payload.js";
import { ConnectorSendError, ConnectorConfigError } from "../errors.js";
import { DiscordConnectorConfigSchema, type DiscordConnectorConfig } from "../types.js";

const SEVERITY_COLOUR: Record<string, number> = {
  info: 0x36a64f,
  warning: 0xff9900,
  error: 0xcc0000,
};

function buildEmbed(payload: OutboundPayload): Record<string, unknown> {
  const fields = payload.fields
    ? Object.entries(payload.fields).map(([name, value]) => ({
        name,
        value: String(value),
        inline: true,
      }))
    : [];

  return {
    title: payload.summary,
    description: payload.body,
    url: payload.sourceUrl,
    color: SEVERITY_COLOUR[payload.severity] ?? SEVERITY_COLOUR["info"],
    fields,
    footer: { text: `Veritas · ${payload.eventType}` },
    timestamp: payload.occurredAt,
  };
}

export class DiscordConnector implements Connector {
  readonly meta: ConnectorMeta;
  private readonly config: DiscordConnectorConfig;

  constructor(id: string, rawConfig: unknown) {
    const parsed = DiscordConnectorConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(
        id,
        `Invalid Discord connector config: ${parsed.error.message}`,
      );
    }
    this.config = parsed.data;
    this.meta = { id, name: "Discord", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const body = JSON.stringify({
      username: this.config.username,
      ...(this.config.avatarUrl ? { avatar_url: this.config.avatarUrl } : {}),
      embeds: [buildEmbed(payload)],
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
          `Discord request failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }

    // Discord returns 204 No Content on success.
    if (response.status !== 204 && !response.ok) {
      const text = await response.text().catch(() => "");
      return err(
        new ConnectorSendError(
          this.meta.id,
          `Discord returned HTTP ${response.status}: ${text}`,
        ),
      );
    }

    return ok(undefined);
  }
}
