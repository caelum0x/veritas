// Message templates — maps notification metadata to rendered subject/body strings

import { truncate } from "@veritas/core";
import type { Notification, RenderedMessage } from "./types.js";

type TemplateRenderer = (notification: Notification) => RenderedMessage;

const DEFAULT_MAX_SUBJECT = 120;
const DEFAULT_MAX_BODY = 2000;

function renderDefault(notification: Notification): RenderedMessage {
  return {
    subject: truncate(notification.title, DEFAULT_MAX_SUBJECT),
    body: truncate(notification.body, DEFAULT_MAX_BODY),
  };
}

function renderVerificationComplete(notification: Notification): RenderedMessage {
  const claimId = (notification.metadata as Record<string, unknown>)?.claimId ?? "unknown";
  const verdict = (notification.metadata as Record<string, unknown>)?.verdict ?? "unknown";
  return {
    subject: `Verification complete — Claim ${claimId}`,
    body: [
      `Your verification request has been completed.`,
      ``,
      `Claim ID : ${claimId}`,
      `Verdict  : ${verdict}`,
      ``,
      notification.body,
    ].join("\n"),
  };
}

function renderOrderSettled(notification: Notification): RenderedMessage {
  const orderId = (notification.metadata as Record<string, unknown>)?.orderId ?? "unknown";
  const amount = (notification.metadata as Record<string, unknown>)?.amount ?? "0";
  return {
    subject: `Payment settled — Order ${orderId}`,
    body: [
      `Your USDC payment has been settled on Base.`,
      ``,
      `Order ID : ${orderId}`,
      `Amount   : ${amount} USDC`,
      ``,
      notification.body,
    ].join("\n"),
  };
}

function renderApiKeyCreated(notification: Notification): RenderedMessage {
  const keyId = (notification.metadata as Record<string, unknown>)?.keyId ?? "unknown";
  return {
    subject: `New API key created`,
    body: [
      `A new API key has been created on your account.`,
      ``,
      `Key ID : ${keyId}`,
      ``,
      `If you did not perform this action, revoke the key immediately in your dashboard.`,
    ].join("\n"),
  };
}

const TEMPLATE_MAP: Record<string, TemplateRenderer> = {
  verification_complete: renderVerificationComplete,
  order_settled: renderOrderSettled,
  api_key_created: renderApiKeyCreated,
};

/**
 * Render a notification into a human-readable subject+body pair.
 * Falls back to a default renderer if no specific template is registered.
 */
export function renderTemplate(notification: Notification): RenderedMessage {
  const kind = (notification.metadata as Record<string, unknown>)?.templateKind;
  const renderer =
    typeof kind === "string" && kind in TEMPLATE_MAP
      ? TEMPLATE_MAP[kind]!
      : renderDefault;
  return renderer(notification);
}

/** Register a custom template renderer for a given templateKind key. */
export function registerTemplate(kind: string, renderer: TemplateRenderer): void {
  TEMPLATE_MAP[kind] = renderer;
}
