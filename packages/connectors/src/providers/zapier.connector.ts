// Zapier connector: triggers a Zapier webhook (catch-hook) with the OutboundPayload as JSON.
import { ok, err, type Result } from "@veritas/core";
import type { Connector, ConnectorMeta } from "../connector.js";
import type { OutboundPayload } from "../payload.js";
import { ConnectorSendError } from "../errors.js";

export interface ZapierConnectorConfig {
  readonly connectorId: string;
  /** The unique Zapier webhook URL (https://hooks.zapier.com/hooks/catch/…). */
  readonly webhookUrl: string;
}

export class ZapierConnector implements Connector {
  readonly meta: ConnectorMeta;
  private readonly config: ZapierConnectorConfig;

  constructor(config: ZapierConnectorConfig) {
    this.config = config;
    this.meta = { id: config.connectorId, name: "Zapier", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    let response: Response;
    try {
      response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (cause) {
      return err(
        new ConnectorSendError(this.meta.id, "Zapier webhook request failed", { cause }),
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return err(
        new ConnectorSendError(
          this.meta.id,
          `Zapier webhook responded with ${response.status}: ${text}`,
        ),
      );
    }

    return ok(undefined);
  }
}
