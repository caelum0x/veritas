// REAL CAP provider: connects Veritas to the live CROO network via the official
// @croo-network/sdk and the real verification engine. Unlike run-cap-provider.ts
// (a local simulation using @veritas/cap + a MockProvider), this authenticates
// with a CROO SDK-Key, listens on the live WebSocket event stream, accepts
// negotiations, runs real verification, and delivers reports the marketplace
// settles on-chain.
//
// Run:  CROO_API_KEY=croo_sk_… ANTHROPIC_API_KEY=sk-ant-… npm run provider:live
// (buildContainer() also reads the CROO_* placeholders from .env — see .env.example.)
import { config as loadEnv } from "dotenv";
import { AgentClient, EventType, DeliverableType } from "@croo-network/sdk";
import type { Event } from "@croo-network/sdk";
import { buildContainer, ENGINE_OPTIONS } from "@veritas/container";
import { runVerification } from "@veritas/verification";
import type { EngineOptions } from "@veritas/verification";
import { isOk } from "@veritas/core";

loadEnv();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

const sdkKey = requireEnv("CROO_API_KEY");
const baseURL = process.env["CROO_API_URL"] ?? "https://api.croo.network";
const wsURL = process.env["CROO_WS_URL"] ?? "wss://api.croo.network/ws";

function log(message: string, ...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(`[croo-provider] ${message}`, ...args);
}

// Build the real verification engine once: real Anthropic provider (when
// ANTHROPIC_API_KEY is set) + the wired domain verifiers and live data sources.
const container = buildContainer();
const engineOptions = container.resolve<EngineOptions>(ENGINE_OPTIONS);
const client = new AgentClient({ baseURL, wsURL }, sdkKey);

/** Parse a CAP negotiation `requirements` string into a verification request. */
function parseRequirements(raw: string): { claims?: unknown; text?: unknown; context?: unknown } {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    /* fall through: treat the raw string as text to verify */
  }
  return { text: raw };
}

function hasWork(req: { claims?: unknown; text?: unknown }): boolean {
  const claims = Array.isArray(req.claims) ? req.claims : [];
  const text = typeof req.text === "string" ? req.text.trim() : "";
  return claims.length > 0 || text.length > 0;
}

/** Validate at negotiation time and accept (or reject malformed input pre-escrow). */
async function onNegotiation(negotiationId: string): Promise<void> {
  const neg = await client.getNegotiation(negotiationId);
  const req = parseRequirements(neg.requirements);
  if (!hasWork(req)) {
    log("rejecting negotiation (no claims[] or text):", negotiationId);
    await client.rejectNegotiation(negotiationId, "requirements must include a non-empty claims[] or text");
    return;
  }
  log("accepting negotiation:", negotiationId);
  await client.acceptNegotiation(negotiationId); // backend builds + submits the on-chain order
}

/** Run verification after payment locks, then deliver the report on-chain. */
async function onOrderPaid(orderId: string): Promise<void> {
  const order = await client.getOrder(orderId);
  const neg = await client.getNegotiation(order.negotiationId);
  const req = parseRequirements(neg.requirements);

  log("verifying order:", orderId);
  const result = await runVerification(req, engineOptions);
  if (!isOk(result)) {
    log("verification failed; rejecting order:", orderId, result.error.message);
    await client.rejectOrder(orderId, `verification failed: ${result.error.message}`);
    return;
  }

  const report = result.value.report; // already carries schema: "veritas.report.v1"
  const deliverableSchema = JSON.stringify(report);
  await client.deliverOrder(orderId, {
    deliverableType: DeliverableType.Schema,
    deliverableSchema,
  });
  log("delivered order:", orderId, `(trustScore ${report.trustScore}, ${result.value.totalTokensUsed} tokens)`);
}

/** Wrap an async event handler so a failure in one job never kills the stream. */
function guard(fn: (e: Event) => Promise<void>): (e: Event) => void {
  return (e) => {
    fn(e).catch((err: unknown) => log("handler error:", err instanceof Error ? err.message : String(err)));
  };
}

async function main(): Promise<void> {
  log("connecting to", wsURL);
  const stream = await client.connectWebSocket();

  stream.on(EventType.NegotiationCreated, guard(async (e) => {
    if (e.negotiation_id) await onNegotiation(e.negotiation_id);
  }));
  stream.on(EventType.OrderPaid, guard(async (e) => {
    if (e.order_id) await onOrderPaid(e.order_id);
  }));
  stream.on(EventType.OrderCompleted, (e) => log("order completed:", e.order_id));
  stream.on(EventType.OrderRejected, (e) => log("order rejected:", e.order_id, e.reason));

  log("Veritas is live on CROO — waiting for jobs. Press Ctrl-C to stop.");
  process.on("SIGINT", () => {
    log("shutting down");
    stream.close();
    process.exit(0);
  });
  await new Promise<never>(() => {}); // run until interrupted
}

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error("[croo-provider] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
