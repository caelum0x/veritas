// Email message type for the Veritas email package

export interface EmailAttachment {
  readonly filename: string;
  readonly content: string | Buffer;
  readonly contentType: string;
  readonly encoding?: "base64" | "utf8" | "binary";
}

export interface EmailMessage {
  readonly to: string | readonly string[];
  readonly from: string;
  readonly replyTo?: string;
  readonly cc?: string | readonly string[];
  readonly bcc?: string | readonly string[];
  readonly subject: string;
  readonly text?: string;
  readonly html?: string;
  readonly attachments?: readonly EmailAttachment[];
  readonly headers?: Readonly<Record<string, string>>;
  readonly messageId?: string;
  readonly inReplyTo?: string;
  readonly references?: readonly string[];
}

export interface SentEmail {
  readonly messageId: string;
  readonly accepted: readonly string[];
  readonly rejected: readonly string[];
  readonly sentAt: string;
}
