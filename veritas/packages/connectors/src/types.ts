// Shared value types and configuration shapes used across connector providers.
import { z } from "zod";

/** HTTP method subset used by webhook-style connectors. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Generic key-value headers map (immutable). */
export type HttpHeaders = Readonly<Record<string, string>>;

/** Base configuration shared by all connectors. */
export const BaseConnectorConfigSchema = z.object({
  /** Milliseconds to wait before aborting a send attempt. */
  timeoutMs: z.number().int().positive().default(10_000),
  /** Number of send retries on transient failure (0 = no retry). */
  maxRetries: z.number().int().min(0).max(5).default(2),
});

export type BaseConnectorConfig = z.infer<typeof BaseConnectorConfigSchema>;

/** Slack connector configuration. */
export const SlackConnectorConfigSchema = BaseConnectorConfigSchema.extend({
  /** Incoming-webhook URL obtained from Slack App configuration. */
  webhookUrl: z.string().url(),
  /** Optional channel override (e.g. "#alerts"). */
  channel: z.string().optional(),
  /** Display name shown in Slack messages. */
  username: z.string().default("Veritas"),
  /** Emoji icon shown next to messages. */
  iconEmoji: z.string().default(":mag:"),
});

export type SlackConnectorConfig = z.infer<typeof SlackConnectorConfigSchema>;

/** Discord connector configuration. */
export const DiscordConnectorConfigSchema = BaseConnectorConfigSchema.extend({
  /** Discord channel webhook URL. */
  webhookUrl: z.string().url(),
  /** Override the webhook's default username. */
  username: z.string().default("Veritas"),
  /** Override the webhook's default avatar URL. */
  avatarUrl: z.string().url().optional(),
});

export type DiscordConnectorConfig = z.infer<typeof DiscordConnectorConfigSchema>;

/** GitHub connector configuration. */
export const GitHubConnectorConfigSchema = BaseConnectorConfigSchema.extend({
  /** Personal access token or GitHub App installation token. */
  token: z.string().min(1),
  /** Target repository in "owner/repo" format. */
  repository: z.string().regex(/^[^/]+\/[^/]+$/),
  /** Default label(s) applied to created issues. */
  labels: z.array(z.string()).default(["veritas"]),
  /** Default assignees for created issues. */
  assignees: z.array(z.string()).default([]),
});

export type GitHubConnectorConfig = z.infer<typeof GitHubConnectorConfigSchema>;

/** Zapier connector configuration. */
export const ZapierConnectorConfigSchema = BaseConnectorConfigSchema.extend({
  /** Zapier webhook (catch-hook) URL. */
  webhookUrl: z.string().url(),
});

export type ZapierConnectorConfig = z.infer<typeof ZapierConnectorConfigSchema>;

/** Generic webhook connector configuration. */
export const WebhookConnectorConfigSchema = BaseConnectorConfigSchema.extend({
  /** Target URL that will receive POST requests. */
  url: z.string().url(),
  /** Additional HTTP headers to include in every request. */
  headers: z.record(z.string(), z.string()).default({}),
  /** Optional shared secret used for HMAC-SHA256 payload signing. */
  secret: z.string().optional(),
});

export type WebhookConnectorConfig = z.infer<typeof WebhookConnectorConfigSchema>;

/** Email connector configuration (console/in-memory implementation). */
export const EmailConnectorConfigSchema = BaseConnectorConfigSchema.extend({
  /** Sender address shown in the From header. */
  fromAddress: z.string().email(),
  /** Recipient address(es). */
  toAddresses: z.array(z.string().email()).min(1),
  /** Optional reply-to address. */
  replyTo: z.string().email().optional(),
});

export type EmailConnectorConfig = z.infer<typeof EmailConnectorConfigSchema>;

/** Microsoft Teams connector configuration. */
export const TeamsConnectorConfigSchema = BaseConnectorConfigSchema.extend({
  /** Teams incoming webhook URL. */
  webhookUrl: z.string().url(),
  /** Optional card theme colour (hex without #). */
  themeColor: z.string().regex(/^[0-9A-Fa-f]{6}$/).default("0076D7"),
});

export type TeamsConnectorConfig = z.infer<typeof TeamsConnectorConfigSchema>;
