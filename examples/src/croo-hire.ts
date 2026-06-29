// REAL buyer: hires Veritas over the live CROO network using @croo-network/sdk.
// Pairs with examples/src/croo-live-provider.ts (the real provider). Opens a
// negotiation against a listed service, pays USDC into escrow when the provider
// accepts, and prints the verified report once delivered & settled on-chain.
//
// Run (provider must be live in another terminal):
//   CROO_TARGET_SERVICE_ID=<service id> npm run hire:live -- "claim one" "claim two"
//
// Use a SEPARATE agent's SDK-Key as CROO_BUYER_API_KEY so it counts as a unique
// counterparty (buying with the provider's own key is a self-trade and is flagged
// for rewards). The buyer wallet needs USDC + a little ETH for gas on Base.
import { config as loadEnv } from "dotenv";
import { AgentClient, EventType } from "@croo-network/sdk";

loadEnv();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

const baseURL = process.env["CROO_API_URL"] ?? "https://api.croo.network";
const wsURL = process.env["CROO_WS_URL"] ?? "wss://api.croo.network/ws";
const usingOwnKey = !process.env["CROO_BUYER_API_KEY"];
const buyerKey = process.env["CROO_BUYER_API_KEY"] ?? requireEnv("CROO_API_KEY");
const serviceId = requireEnv("CROO_TARGET_SERVICE_ID");

const claimArgs = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const claims = claimArgs.length > 0 ? claimArgs : ["The Eiffel Tower is in Paris.", "Bitcoin launched in 2009."];
const requirements = JSON.stringify({ claims });

function log(message: string, ...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(`[croo-hire] ${message}`, ...args);
}

async function main(): Promise<void> {
  if (usingOwnKey) {
    log("WARNING: buying with the provider's own SDK-Key — this is a self-trade and is");
    log("         flagged for reward eligibility. Set CROO_BUYER_API_KEY to a different agent.");
  }

  const client = new AgentClient({ baseURL, wsURL }, buyerKey);
  const stream = await client.connectWebSocket();
  let paid = false;

  log(`opening negotiation for service ${serviceId} with ${claims.length} claim(s)`);
  const negotiation = await client.negotiateOrder({ serviceId, requirements });
  log(`negotiation ${negotiation.negotiationId} — waiting for the provider to accept…`);

  stream.on(EventType.OrderCreated, (e) => {
    if (paid || e.negotiation_id !== negotiation.negotiationId || !e.order_id) return;
    paid = true;
    const orderId = e.order_id;
    log(`order ${orderId} created — paying USDC into escrow…`);
    client
      .payOrder(orderId)
      .then((r) => log(`paid (txHash ${r.txHash}) — waiting for the verified report…`))
      .catch((err: unknown) => log("pay error:", err instanceof Error ? err.message : String(err)));
  });

  stream.on(EventType.OrderCompleted, (e) => {
    if (!e.order_id) return;
    client
      .getDelivery(e.order_id)
      .then((delivery) => {
        log(`order ${e.order_id} completed — report delivered (contentHash ${delivery.contentHash})`);
        try {
          const report = JSON.parse(delivery.deliverableSchema) as { trustScore?: number; summary?: string };
          log(`trustScore: ${report.trustScore} — ${report.summary}`);
        } catch {
          log("deliverable:", delivery.deliverableSchema.slice(0, 500));
        }
        stream.close();
        process.exit(0);
      })
      .catch((err: unknown) => log("getDelivery error:", err instanceof Error ? err.message : String(err)));
  });

  stream.on(EventType.OrderRejected, (e) => {
    log(`order ${e.order_id} rejected: ${e.reason}`);
    stream.close();
    process.exit(1);
  });

  setTimeout(() => {
    log("timed out after 3 min waiting for completion — is the provider running?");
    stream.close();
    process.exit(1);
  }, 180_000);
}

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error("[croo-hire] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
