// Console log transport for development/testing — prints emails to stdout instead of sending

import { ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { EmailMessage, SentEmail } from "./email.js";
import type { EmailTransport, EmailTransportOptions } from "./transport.js";
import type { EmailError } from "./errors.js";

function generateMessageId(): string {
  return `<${Date.now()}.${Math.random().toString(36).slice(2)}@console.local>`;
}

function toAddressArray(addr: string | readonly string[]): readonly string[] {
  return Array.isArray(addr) ? addr : [addr as string];
}

export class ConsoleEmailTransport implements EmailTransport {
  readonly name = "console";

  send(
    message: EmailMessage,
    _options?: EmailTransportOptions
  ): Promise<Result<SentEmail, EmailError>> {
    const messageId = message.messageId ?? generateMessageId();
    const to = toAddressArray(message.to);

    console.log("─".repeat(60));
    console.log("[ConsoleEmailTransport] Email message:");
    console.log(`  From:    ${message.from}`);
    console.log(`  To:      ${to.join(", ")}`);
    if (message.cc) console.log(`  CC:      ${toAddressArray(message.cc).join(", ")}`);
    if (message.bcc) console.log(`  BCC:     ${toAddressArray(message.bcc).join(", ")}`);
    if (message.replyTo) console.log(`  ReplyTo: ${message.replyTo}`);
    console.log(`  Subject: ${message.subject}`);
    console.log(`  MsgID:   ${messageId}`);
    if (message.text) {
      console.log("  [text]");
      console.log(message.text);
    }
    if (message.html) {
      console.log("  [html]");
      console.log(message.html);
    }
    console.log("─".repeat(60));

    const sent: SentEmail = {
      messageId,
      accepted: [...to],
      rejected: [],
      sentAt: new Date().toISOString(),
    };

    return Promise.resolve(ok(sent));
  }

  verify(): Promise<Result<true, EmailError>> {
    return Promise.resolve(ok(true as const));
  }
}
