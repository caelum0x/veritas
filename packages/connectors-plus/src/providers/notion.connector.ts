// NotionConnector: posts a new page (database entry) to a Notion database via the Notion API.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import type { ConnectorMeta } from "@veritas/connectors";
import type { OutboundPayload } from "@veritas/connectors";
import { ConnectorConfigError } from "@veritas/connectors";
import { AbstractConnector, BasePlusConfigSchema, doPost, assertOk } from "../base.js";

const NotionConfigSchema = BasePlusConfigSchema.extend({
  /** Notion integration token (secret_…). */
  token: z.string().min(1),
  /** Target Notion database ID (32-char UUID). */
  databaseId: z.string().min(32),
  /** Notion API version header value. */
  notionVersion: z.string().default("2022-06-28"),
});

type NotionConfig = z.infer<typeof NotionConfigSchema>;

const NOTION_API = "https://api.notion.com/v1/pages";

const SEVERITY_EMOJI: Record<string, string> = {
  info: "ℹ️",
  warning: "⚠️",
  error: "🚨",
};

function buildPage(payload: OutboundPayload, databaseId: string): Record<string, unknown> {
  const emoji = SEVERITY_EMOJI[payload.severity] ?? "ℹ️";
  const richText = (text: string) => [{ type: "text", text: { content: text } }];

  const properties: Record<string, unknown> = {
    Name: { title: richText(`${emoji} ${payload.summary}`) },
    "Event Type": { rich_text: richText(payload.eventType) },
    Severity: { select: { name: payload.severity } },
    "Occurred At": { date: { start: payload.occurredAt } },
  };

  if (payload.sourceUrl) {
    properties["Source URL"] = { url: payload.sourceUrl };
  }

  if (payload.fields) {
    for (const [key, value] of Object.entries(payload.fields)) {
      properties[key] = { rich_text: richText(String(value)) };
    }
  }

  const children: unknown[] = [];
  if (payload.body) {
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: richText(payload.body) },
    });
  }

  return {
    parent: { database_id: databaseId },
    properties,
    ...(children.length > 0 ? { children } : {}),
  };
}

export class NotionConnector extends AbstractConnector {
  readonly meta: ConnectorMeta;
  private readonly config: NotionConfig;

  constructor(id: string, rawConfig: unknown) {
    super();
    const parsed = NotionConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(id, `Invalid Notion config: ${parsed.error.message}`);
    }
    this.config = parsed.data;
    this.meta = { id, name: "Notion", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const headers = {
      Authorization: `Bearer ${this.config.token}`,
      "Notion-Version": this.config.notionVersion,
    };

    const body = buildPage(payload, this.config.databaseId);
    const result = await doPost(this.meta.id, NOTION_API, headers, body, this.config.timeoutMs);
    if (!result.ok) return result;

    return assertOk(this.meta.id, result.value, "Notion API");
  }
}
