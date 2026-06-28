// Email address parsing and validation utilities

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";

export interface EmailAddress {
  readonly address: string;
  readonly name?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailAddressSchema = z.object({
  address: z.string().regex(emailRegex, "Invalid email address format"),
  name: z.string().optional(),
});

/** Parse a raw email string into an EmailAddress, supporting "Name <addr>" format. */
export function parseEmailAddress(raw: string): Result<EmailAddress, string> {
  const trimmed = raw.trim();

  // "Display Name <address@example.com>" format
  const namedMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (namedMatch !== null) {
    const name = namedMatch[1]!.trim().replace(/^["']|["']$/g, "");
    const address = namedMatch[2]!.trim().toLowerCase();
    if (!emailRegex.test(address)) {
      return err(`Invalid email address: ${address}`);
    }
    return ok({ address, name: name.length > 0 ? name : undefined });
  }

  // Plain address
  const address = trimmed.toLowerCase();
  if (!emailRegex.test(address)) {
    return err(`Invalid email address: ${address}`);
  }
  return ok({ address });
}

/** Format an EmailAddress back to a string, e.g. "Name <addr>" or plain address. */
export function formatEmailAddress(addr: EmailAddress): string {
  if (addr.name !== undefined && addr.name.length > 0) {
    const needsQuotes = /[,;<>@"()]/.test(addr.name);
    const displayName = needsQuotes ? `"${addr.name.replace(/"/g, '\\"')}"` : addr.name;
    return `${displayName} <${addr.address}>`;
  }
  return addr.address;
}

/** Validate an email address string without parsing into a struct. */
export function isValidEmailAddress(value: string): boolean {
  return emailRegex.test(value.trim());
}
