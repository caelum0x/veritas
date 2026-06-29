// EmailTransport interface for pluggable email delivery backends

import type { Result } from "@veritas/core";
import type { EmailMessage, SentEmail } from "./email.js";
import type { EmailError } from "./errors.js";

export interface EmailTransportOptions {
  readonly timeoutMs?: number;
  readonly retries?: number;
}

export interface EmailTransport {
  readonly name: string;
  send(message: EmailMessage, options?: EmailTransportOptions): Promise<Result<SentEmail, EmailError>>;
  verify?(): Promise<Result<true, EmailError>>;
  close?(): Promise<void>;
}
