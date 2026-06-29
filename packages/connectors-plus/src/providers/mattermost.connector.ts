// MattermostConnector: sends outbound payloads to a Mattermost channel via incoming webhook or REST API post.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import type { ConnectorMeta } from "@veritas/connectors";
import type { OutboundPayload } from "@veritas/connectors";
import { ConnectorConfigError } from "@veritas/connectors";
import { AbstractConnector, BasePlusConfigSchema, doPost, assertOk } from "../base.js";

const MattermostConfigSchema = BasePlusConfigSchema.extend({
  /**
   * Full incoming webhook URL, e.g. https://mattermost.example.com/hooks/<id>.
   * Takes precedence over baseUrl + token when both are provided.
   */
  webhookUrl: z.string().url().optional(),
  /** Mattermost server base URL (required when webhookUrl is absent). */
  baseUrl: z.string().url().optional(),
  /** Bot or personal access token (required when webhookUrl is absent). */
  token: z.string().min(1).optional(),
  /** Channel ID or name (required when webhookUrl is absent). */
  channelId: z.string().min(1).optional(),
  /** Optional display name override for the bot. */
  username: z.string().optional(),
  /** Optional icon URL for the bot avatar. */
  iconUrl: z.string().url().optional(),
});

type MattermostConfig = z.infer<typeof MattermostConfigSchema>;

const SEVERITY_EMOJI: Record<string, string> = {
  info: ":information_source:",
  warning: ":warning:",
  error: ":rotating_light:",
};

function buildAttachment(payload: OutboundPayload): Record<string, unknown> {
  const colorMap: Record<string, string> = {
    info: "#2196F3",
    warning: "#FF9800",
    error: "#F44336",
  };
  const color = colorMap[payload.severity] ?? "#9E9E9E";

  const fields: Array<Record<string, unknown>> = [
    { short: true, title: "Event Type", value: payload.eventType },
    { short: true, title: "Severity", value: payload.severity.toUpperCase() },
    { short: true, title: "Occurred At", value: payload.occurredAt },
  ];

  if (payload.fields) {
    for (const [k, v] of Object.entries(payload.fields)) {
      fields.push({ short: true, title: k, value: String(v) });
    }
  }

  const attachment: Record<string, unknown> = {
    color,
    title: payload.summary,
    fields,
  };

  if (payload.body) attachment["text"] = payload.body;
  if (payload.sourceUrl) attachment["title_link"] = payload.sourceUrl;

  return attachment;
}

function buildMessageBody(
  payload: OutboundPayload,
  config: MattermostConfig,
  channelId: string | undefined,
): Record<string, unknown> {
  const emoji = SEVERITY_EMOJI[payload.severity] ?? ":loudspeaker:";
  const message: Record<string, unknown> = {
    text: `${emoji} **${payload.summary}**`,
    attachments: [buildAttachment(payload)],
  };

  if (channelId) message["channel_id"] = channelId;
  if (config.username) message["username"] = config.username;
  if (config.iconUrl) message["icon_url"] = config.iconUrl;

  return message;
}

function resolveEndpoint(
  id: string,
  config: MattermostConfig,
): Result<{ url: string; headers: Record<string, string>; channelId: string | undefined }> {
  if (config.webhookUrl) {
    return ok({ url: config.webhookUrl, headers: {}, channelId: undefined });
  }

  if (!config.baseUrl || !config.token || !config.channelId) {
    return err(
      new ConnectorConfigError(
        id,
        "Mattermost connector requires either webhookUrl or all of baseUrl, token, and channelId.",
      ),
    );
  }

  const url = `${config.baseUrl.replace(/\/+$/, "")}/api/v4/posts`;
  const headers = { Authorization: `Bearer ${config.token}` };
  return ok({ url, headers, channelId: config.channelId });
}

export class MattermostConnector extends AbstractConnector {
  readonly meta: ConnectorMeta;
  private readonly config: MattermostConfig;

  constructor(id: string, rawConfig: unknown) {
    super();
    const parsed = MattermostConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(id, `Invalid Mattermost config: ${parsed.error.message}`);
    }
    this.config = parsed.data;
    this.meta = { id, name: "Mattermost", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const endpointResult = resolveEndpoint(this.meta.id, this.config);
    if (!endpointResult.ok) return endpointResult;

    const { url, headers, channelId } = endpointResult.value;
    const body = buildMessageBody(payload, this.config, channelId);
    const result = await doPost(this.meta.id, url, headers, body, this.config.timeoutMs);
    if (!result.ok) return result;

    return assertOk(this.meta.id, result.value, "Mattermost API");
  }
}
