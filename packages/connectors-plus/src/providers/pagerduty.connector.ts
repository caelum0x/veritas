// PagerDuty connector: sends OutboundPayload as a PagerDuty Events API v2 alert.
import { z } from "zod";
import { ok, err, isOk, type Result } from "@veritas/core";
import type { ConnectorMeta } from "@veritas/connectors";
import type { OutboundPayload } from "@veritas/connectors";
import {
  AbstractConnector,
  BasePlusConfigSchema,
  ConnectorConfigError,
  ConnectorSendError,
  doPost,
} from "../base.js";

const PagerDutyConfigSchema = BasePlusConfigSchema.extend({
  /** PagerDuty Events API v2 integration key (routing key). */
  routingKey: z.string().min(1),
  /** PagerDuty Events API endpoint. */
  eventsUrl: z.string().url().default("https://events.pagerduty.com/v2/enqueue"),
  /** Default severity mapping for "info" payloads. */
  infoSeverity: z.enum(["info", "warning", "error", "critical"]).default("info"),
});

type PagerDutyConfig = z.infer<typeof PagerDutyConfigSchema>;

const SEVERITY_MAP: Record<string, "info" | "warning" | "error" | "critical"> = {
  info: "info",
  warning: "warning",
  error: "critical",
};

function buildEvent(payload: OutboundPayload, routingKey: string): Record<string, unknown> {
  const details: Record<string, unknown> = {
    event_type: payload.eventType,
    delivery_id: payload.deliveryId,
    occurred_at: payload.occurredAt,
    ...(payload.fields ?? {}),
  };

  return {
    routing_key: routingKey,
    event_action: "trigger",
    dedup_key: payload.deliveryId,
    payload: {
      summary: payload.summary,
      severity: SEVERITY_MAP[payload.severity] ?? "info",
      source: payload.sourceUrl ?? "veritas",
      timestamp: payload.occurredAt,
      custom_details: details,
    },
    ...(payload.sourceUrl
      ? { links: [{ href: payload.sourceUrl, text: "View details" }] }
      : {}),
  };
}

export class PagerDutyConnector extends AbstractConnector {
  readonly meta: ConnectorMeta;
  private readonly config: PagerDutyConfig;

  constructor(id: string, rawConfig: unknown) {
    super();
    const parsed = PagerDutyConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(
        id,
        `Invalid PagerDuty connector config: ${parsed.error.message}`,
      );
    }
    this.config = parsed.data;
    this.meta = { id, name: "PagerDuty", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const event = buildEvent(payload, this.config.routingKey);

    const result = await doPost(
      this.meta.id,
      this.config.eventsUrl,
      {},
      event,
      this.config.timeoutMs,
    );

    if (!isOk(result)) return result;

    const { status, body } = result.value;
    if (status >= 200 && status < 300) return ok(undefined);

    return err(new ConnectorSendError(this.meta.id, `PagerDuty returned HTTP ${status}: ${body}`));
  }
}
