// Telegram connector: delivers OutboundPayload via Telegram Bot API sendMessage.
import { z } from "zod";
import { ok, isOk, type Result } from "@veritas/core";
import type { ConnectorMeta } from "@veritas/connectors";
import type { OutboundPayload } from "@veritas/connectors";
import {
  AbstractConnector,
  BasePlusConfigSchema,
  ConnectorConfigError,
  doPost,
  assertOk,
} from "../base.js";

const TelegramConfigSchema = BasePlusConfigSchema.extend({
  /** Bot token issued by @BotFather. */
  botToken: z.string().min(1),
  /** Target chat ID (numeric or "@channel_username"). */
  chatId: z.union([z.string().min(1), z.number().int()]),
  /** Telegram parse mode for formatting. */
  parseMode: z.enum(["HTML", "Markdown", "MarkdownV2"]).default("HTML"),
  /** Disable link preview in messages. */
  disableWebPagePreview: z.boolean().default(true),
});

type TelegramConfig = z.infer<typeof TelegramConfigSchema>;

const SEVERITY_EMOJI: Record<string, string> = {
  info: "ℹ️",
  warning: "⚠️",
  error: "🚨",
};

function buildHtmlMessage(payload: OutboundPayload): string {
  const emoji = SEVERITY_EMOJI[payload.severity] ?? SEVERITY_EMOJI["info"];
  const lines: string[] = [];

  lines.push(`${emoji} <b>${escapeHtml(payload.summary)}</b>`);
  lines.push(`<i>${escapeHtml(payload.eventType)}</i> · ${escapeHtml(payload.occurredAt)}`);

  if (payload.body) {
    lines.push("");
    lines.push(escapeHtml(payload.body));
  }

  if (payload.fields && Object.keys(payload.fields).length > 0) {
    lines.push("");
    for (const [key, value] of Object.entries(payload.fields)) {
      lines.push(`• <b>${escapeHtml(key)}:</b> ${escapeHtml(String(value))}`);
    }
  }

  if (payload.sourceUrl) {
    lines.push("");
    lines.push(`<a href="${payload.sourceUrl}">View details</a>`);
  }

  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export class TelegramConnector extends AbstractConnector {
  readonly meta: ConnectorMeta;
  private readonly config: TelegramConfig;
  private readonly apiBase: string;

  constructor(id: string, rawConfig: unknown) {
    super();
    const parsed = TelegramConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(
        id,
        `Invalid Telegram connector config: ${parsed.error.message}`,
      );
    }
    this.config = parsed.data;
    this.meta = { id, name: "Telegram", version: "1.0.0" };
    this.apiBase = `https://api.telegram.org/bot${this.config.botToken}`;
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const body = {
      chat_id: this.config.chatId,
      text: buildHtmlMessage(payload),
      parse_mode: this.config.parseMode,
      disable_web_page_preview: this.config.disableWebPagePreview,
    };

    const result = await doPost(
      this.meta.id,
      `${this.apiBase}/sendMessage`,
      {},
      body,
      this.config.timeoutMs,
    );

    if (!isOk(result)) return result;

    return assertOk(this.meta.id, result.value, "Telegram API");
  }
}
