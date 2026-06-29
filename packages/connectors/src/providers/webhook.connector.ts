// Generic webhook connector: HTTP POST of OutboundPayload with optional HMAC-SHA256 signing.
import { ok, err, type Result } from "@veritas/core";
import { createHmac } from "node:crypto";
import type { Connector, ConnectorMeta } from "../connector.js";
import type { OutboundPayload } from "../payload.js";
import { ConnectorSendError } from "../errors.js";

export interface WebhookConnectorConfig {
  readonly connectorId: string;
  readonly url: string;
  /** Optional HMAC-SHA256 secret; when set, adds an X-Veritas-Signature header. */
  readonly signingSecret?: string;
  /** Extra headers merged into every request. */
  readonly headers?: Readonly<Record<string, string>>;
  /** HTTP method; defaults to POST. */
  readonly method?: "POST" | "PUT";
}

function computeSignature(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export class WebhookConnector implements Connector {
  readonly meta: ConnectorMeta;
  private readonly config: WebhookConnectorConfig;

  constructor(config: WebhookConnectorConfig) {
    this.config = config;
    this.meta = { id: config.connectorId, name: "Webhook", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const body = JSON.stringify(payload);
    const method = this.config.method ?? "POST";

    const extraHeaders: Record<string, string> = { ...(this.config.headers ?? {}) };
    if (this.config.signingSecret) {
      extraHeaders["X-Veritas-Signature"] = computeSignature(this.config.signingSecret, body);
    }

    let response: Response;
    try {
      response = await fetch(this.config.url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Veritas-Delivery": payload.deliveryId,
          "X-Veritas-Event": payload.eventType,
          ...extraHeaders,
        },
        body,
      });
    } catch (cause) {
      return err(
        new ConnectorSendError(this.meta.id, "Webhook request failed", { cause }),
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return err(
        new ConnectorSendError(
          this.meta.id,
          `Webhook responded with ${response.status}: ${text}`,
        ),
      );
    }

    return ok(undefined);
  }
}
