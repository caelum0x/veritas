// TwilioSms connector: delivers OutboundPayload as an SMS via Twilio REST API.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import type { ConnectorMeta } from "@veritas/connectors";
import type { OutboundPayload } from "@veritas/connectors";
import {
  AbstractConnector,
  BasePlusConfigSchema,
  ConnectorConfigError,
  ConnectorSendError,
} from "../base.js";

const TwilioSmsConfigSchema = BasePlusConfigSchema.extend({
  /** Twilio Account SID. */
  accountSid: z.string().min(1),
  /** Twilio Auth Token. */
  authToken: z.string().min(1),
  /** Source phone number (E.164 format, e.g. +15551234567). */
  fromNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
  /** Destination phone number(s) in E.164 format. */
  toNumbers: z.array(z.string().regex(/^\+[1-9]\d{1,14}$/)).min(1),
  /** Maximum SMS character length before truncation. */
  maxLength: z.number().int().min(1).max(1600).default(160),
});

type TwilioSmsConfig = z.infer<typeof TwilioSmsConfigSchema>;

function buildSmsText(payload: OutboundPayload, maxLength: number): string {
  const prefix = `[${payload.severity.toUpperCase()}] `;
  const base = `${prefix}${payload.summary}`;
  if (base.length >= maxLength) {
    return base.slice(0, maxLength - 1) + "…";
  }
  if (payload.sourceUrl) {
    const withUrl = `${base}\n${payload.sourceUrl}`;
    if (withUrl.length <= maxLength) return withUrl;
  }
  return base;
}

async function postFormEncoded(
  url: string,
  credentials: string,
  params: Record<string, string>,
  timeoutMs: number,
): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams(params).toString(),
      signal: controller.signal,
    });
    const body = await response.text().catch(() => "");
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

export class TwilioSmsConnector extends AbstractConnector {
  readonly meta: ConnectorMeta;
  private readonly config: TwilioSmsConfig;
  private readonly credentials: string;
  private readonly apiUrl: string;

  constructor(id: string, rawConfig: unknown) {
    super();
    const parsed = TwilioSmsConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(
        id,
        `Invalid TwilioSms connector config: ${parsed.error.message}`,
      );
    }
    this.config = parsed.data;
    this.meta = { id, name: "TwilioSms", version: "1.0.0" };
    this.credentials = Buffer.from(
      `${this.config.accountSid}:${this.config.authToken}`,
    ).toString("base64");
    this.apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const text = buildSmsText(payload, this.config.maxLength);

    const results = await Promise.all(
      this.config.toNumbers.map((to) =>
        postFormEncoded(
          this.apiUrl,
          this.credentials,
          { From: this.config.fromNumber, To: to, Body: text },
          this.config.timeoutMs,
        ).catch((e: unknown) => ({
          status: 0,
          body: e instanceof Error ? e.message : String(e),
        })),
      ),
    );

    const failures = results.filter((r) => r.status < 200 || r.status >= 300);
    if (failures.length > 0) {
      const detail = failures
        .map((f) => `HTTP ${f.status}: ${f.body}`)
        .join("; ");
      return err(new ConnectorSendError(this.meta.id, `Twilio SMS failed: ${detail}`));
    }

    return ok(undefined);
  }
}
