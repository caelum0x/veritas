// Microsoft Teams connector: posts Adaptive Card messages via an incoming webhook URL.
import { ok, err, type Result } from "@veritas/core";
import type { Connector, ConnectorMeta } from "../connector.js";
import type { OutboundPayload } from "../payload.js";
import { ConnectorSendError } from "../errors.js";

export interface TeamsConnectorConfig {
  readonly connectorId: string;
  /** Incoming Webhook URL from the Teams channel connector settings. */
  readonly webhookUrl: string;
}

type TeamsColor = "default" | "good" | "warning" | "attention";

function severityToColor(severity: OutboundPayload["severity"]): TeamsColor {
  if (severity === "error") return "attention";
  if (severity === "warning") return "warning";
  return "default";
}

interface AdaptiveCardBody {
  readonly type: string;
  readonly [key: string]: unknown;
}

function buildAdaptiveCard(payload: OutboundPayload): Record<string, unknown> {
  const color = severityToColor(payload.severity);
  const bodyItems: AdaptiveCardBody[] = [
    {
      type: "TextBlock",
      text: payload.summary,
      weight: "Bolder",
      size: "Medium",
      color,
      wrap: true,
    },
    {
      type: "TextBlock",
      text: `${payload.eventType} · ${payload.occurredAt}`,
      isSubtle: true,
      spacing: "None",
      wrap: true,
    },
  ];

  if (payload.body) {
    bodyItems.push({ type: "TextBlock", text: payload.body, wrap: true, spacing: "Medium" });
  }

  if (payload.fields && Object.keys(payload.fields).length > 0) {
    const facts = Object.entries(payload.fields).map(([k, v]) => ({ title: k, value: String(v) }));
    bodyItems.push({ type: "FactSet", facts, spacing: "Medium" });
  }

  const actions: unknown[] = payload.sourceUrl
    ? [{ type: "Action.OpenUrl", title: "View full context", url: payload.sourceUrl }]
    : [];

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: bodyItems,
          ...(actions.length > 0 ? { actions } : {}),
        },
      },
    ],
  };
}

export class TeamsConnector implements Connector {
  readonly meta: ConnectorMeta;
  private readonly config: TeamsConnectorConfig;

  constructor(config: TeamsConnectorConfig) {
    this.config = config;
    this.meta = { id: config.connectorId, name: "Microsoft Teams", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const card = buildAdaptiveCard(payload);

    let response: Response;
    try {
      response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
    } catch (cause) {
      return err(
        new ConnectorSendError(this.meta.id, "Teams webhook request failed", { cause }),
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return err(
        new ConnectorSendError(
          this.meta.id,
          `Teams webhook responded with ${response.status}: ${text}`,
        ),
      );
    }

    return ok(undefined);
  }
}
