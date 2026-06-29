// Verify incoming Veritas webhook signatures and dispatch handlers by event type.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebhookVerifier, WebhookEventType, WebhookEventSchema } from "@veritas/webhooks";
import type { WebhookEvent } from "@veritas/webhooks";
import type { VerificationReport } from "@veritas/contracts";

/** Shared webhook signing secret — set via environment. */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/** Read the raw body of an IncomingMessage as UTF-8. */
async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Handle a verification.completed event. */
function onVerificationCompleted(event: WebhookEvent): void {
  const report = event.payload as Partial<VerificationReport>;
  process.stdout.write(
    `[webhook] verification.completed: trustScore=${report.trustScore ?? "?"} ` +
      `claims=${report.claims?.length ?? 0}\n`,
  );
}

/** Handle a job.failed event. */
function onJobFailed(event: WebhookEvent): void {
  const { jobId, reason } = event.payload as { jobId?: string; reason?: string };
  process.stderr.write(
    `[webhook] job.failed: jobId=${jobId ?? "?"} reason=${reason ?? "unknown"}\n`,
  );
}

/** Route a verified event to the appropriate handler. */
function dispatchEvent(event: WebhookEvent): void {
  switch (event.type) {
    case WebhookEventType.VERIFICATION_COMPLETED:
      onVerificationCompleted(event);
      break;
    case WebhookEventType.JOB_FAILED:
      onJobFailed(event);
      break;
    case WebhookEventType.ORDER_SETTLED:
      process.stdout.write(
        `[webhook] order.settled: orderId=${event.payload["orderId"] ?? "?"}\n`,
      );
      break;
    default:
      process.stdout.write(`[webhook] received event type=${event.type} id=${event.id}\n`);
  }
}

/** Create and start the webhook receiver HTTP server. */
function startWebhookReceiver(port: number, secret: string): void {
  const verifier = new WebhookVerifier({ maxAgeMs: 5 * 60 * 1000 });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST" || req.url !== "/webhooks/veritas") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    let body: string;
    try {
      body = await readBody(req);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Failed to read request body");
      return;
    }

    const signatureHeader = req.headers["x-veritas-signature"] as string | undefined;
    if (!signatureHeader) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing signature header");
      return;
    }

    const verifyResult = verifier.verify({ signatureHeader, body, secret });
    if (!verifyResult.ok) {
      process.stderr.write(`[webhook] signature verification failed: ${verifyResult.error}\n`);
      res.writeHead(401, { "Content-Type": "text/plain" });
      res.end("Invalid signature");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body) as unknown;
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Invalid JSON body");
      return;
    }

    const eventResult = WebhookEventSchema.safeParse(parsed);
    if (!eventResult.success) {
      process.stderr.write(`[webhook] invalid event schema: ${eventResult.error.message}\n`);
      res.writeHead(422, { "Content-Type": "text/plain" });
      res.end("Invalid event schema");
      return;
    }

    dispatchEvent(eventResult.data);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ received: true }));
  });

  server.listen(port, () => {
    process.stdout.write(`[webhook] receiver listening on http://0.0.0.0:${port}/webhooks/veritas\n`);
  });
}

const WEBHOOK_SECRET = requireEnv("VERITAS_WEBHOOK_SECRET");
const PORT = Number(process.env["PORT"] ?? 3080);

startWebhookReceiver(PORT, WEBHOOK_SECRET);
