// SMTP transport — sends email via nodemailer over SMTP with TLS support

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { EmailMessage, SentEmail } from "./email.js";
import type { EmailTransport, EmailTransportOptions } from "./transport.js";
import { emailSendFailed, emailTransportUnavailable, EmailError } from "./errors.js";

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly auth?: {
    readonly user: string;
    readonly pass: string;
  };
  readonly tls?: {
    readonly rejectUnauthorized?: boolean;
    readonly minVersion?: string;
  };
  readonly pool?: boolean;
  readonly maxConnections?: number;
  readonly timeoutMs?: number;
}

interface NodemailerTransporter {
  sendMail(options: unknown): Promise<{ messageId: string; accepted: string[]; rejected: string[] }>;
  verify(): Promise<boolean>;
  close(): void;
}

function toAddressArray(addr: string | readonly string[]): string[] {
  return Array.isArray(addr) ? [...addr] : [addr as string];
}

function buildMailOptions(message: EmailMessage): Record<string, unknown> {
  return {
    from: message.from,
    to: toAddressArray(message.to).join(", "),
    ...(message.cc ? { cc: toAddressArray(message.cc).join(", ") } : {}),
    ...(message.bcc ? { bcc: toAddressArray(message.bcc).join(", ") } : {}),
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    subject: message.subject,
    ...(message.text ? { text: message.text } : {}),
    ...(message.html ? { html: message.html } : {}),
    ...(message.messageId ? { messageId: message.messageId } : {}),
    ...(message.inReplyTo ? { inReplyTo: message.inReplyTo } : {}),
    ...(message.references ? { references: message.references.join(" ") } : {}),
    ...(message.headers ? { headers: message.headers } : {}),
    ...(message.attachments
      ? {
          attachments: message.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
            encoding: a.encoding,
          })),
        }
      : {}),
  };
}

export class SmtpEmailTransport implements EmailTransport {
  readonly name = "smtp";
  readonly #config: SmtpConfig;
  #transporter: NodemailerTransporter | null = null;

  constructor(config: SmtpConfig) {
    this.#config = config;
  }

  async #getTransporter(): Promise<Result<NodemailerTransporter, EmailError>> {
    if (this.#transporter) return ok(this.#transporter);

    try {
      const nodemailer = (await import("nodemailer")) as {
        createTransport: (opts: unknown) => NodemailerTransporter;
      };

      this.#transporter = nodemailer.createTransport({
        host: this.#config.host,
        port: this.#config.port,
        secure: this.#config.secure,
        ...(this.#config.auth ? { auth: this.#config.auth } : {}),
        ...(this.#config.tls ? { tls: this.#config.tls } : {}),
        pool: this.#config.pool ?? false,
        maxConnections: this.#config.maxConnections ?? 5,
        connectionTimeout: this.#config.timeoutMs ?? 10_000,
        greetingTimeout: this.#config.timeoutMs ?? 10_000,
        socketTimeout: this.#config.timeoutMs ?? 30_000,
      });

      return ok(this.#transporter);
    } catch (cause) {
      return err(emailTransportUnavailable("smtp", cause));
    }
  }

  async send(
    message: EmailMessage,
    options?: EmailTransportOptions
  ): Promise<Result<SentEmail, EmailError>> {
    const transporterResult = await this.#getTransporter();
    if (transporterResult.ok === false) return transporterResult;

    const transporter = transporterResult.value;
    const mailOptions = buildMailOptions(message);
    const timeoutMs = options?.timeoutMs ?? this.#config.timeoutMs ?? 30_000;

    try {
      const sendPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`SMTP send timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);

      const sent: SentEmail = {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        sentAt: new Date().toISOString(),
      };

      return ok(sent);
    } catch (cause) {
      return err(emailSendFailed(`SMTP send failed to ${String(message.to)}`, cause));
    }
  }

  async verify(): Promise<Result<true, EmailError>> {
    const transporterResult = await this.#getTransporter();
    if (transporterResult.ok === false) return transporterResult;

    try {
      await transporterResult.value.verify();
      return ok(true as const);
    } catch (cause) {
      return err(emailTransportUnavailable("smtp", cause));
    }
  }

  async close(): Promise<void> {
    if (this.#transporter) {
      this.#transporter.close();
      this.#transporter = null;
    }
  }
}
