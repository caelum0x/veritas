import 'dotenv/config';
import {
  AgentClient,
  DeliverableType,
  EventType,
  type Event,
} from '@croo-network/sdk';
import { createLogger } from '../src/logger.js';
import {
  VerificationReportSchema,
  type VerificationRequest,
} from '../src/verify/schema.js';

/**
 * A minimal BUYER agent that hires Veritas over CAP — the A2A composability
 * demo. This is exactly how another agent (a research agent, a content agent, a
 * DeFi alert bot) would call Veritas as a dependency before trusting or acting
 * on a piece of generated text.
 *
 * Run a Veritas provider (`npm start`) in one terminal, then run this with the
 * target service id of your listed Veritas service:
 *
 *   CROO_TARGET_SERVICE_ID=<veritas service id> npm run requester
 */
async function main(): Promise<void> {
  const logger = createLogger('info');

  const apiUrl = required('CROO_API_URL');
  const wsUrl = required('CROO_WS_URL');
  const sdkKey = required('CROO_SDK_KEY');
  const serviceId = required('CROO_TARGET_SERVICE_ID');

  const client = new AgentClient(
    { baseURL: apiUrl, wsURL: wsUrl, rpcURL: process.env.BASE_RPC_URL, logger },
    sdkKey,
  );

  // The claims this buyer agent wants checked before it acts on them.
  const request: VerificationRequest = {
    claims: [
      'The Eiffel Tower is located in Paris, France.',
      'Bitcoin was created by a person or group using the name Satoshi Nakamoto.',
      'The Great Wall of China is visible from the Moon with the naked eye.',
    ],
    context: 'General knowledge verification for an automated content pipeline.',
  };

  const stream = await client.connectWebSocket();

  stream.on(EventType.OrderCreated, async (e: Event) => {
    if (!e.order_id) return;
    logger.info('order created; paying USDC into escrow', { orderId: e.order_id });
    try {
      const res = await client.payOrder(e.order_id);
      logger.info('payment submitted', { orderId: e.order_id, txHash: res.txHash });
    } catch (err) {
      logger.error('payment failed', { error: msg(err) });
      stream.close();
      process.exit(1);
    }
  });

  stream.on(EventType.OrderCompleted, async (e: Event) => {
    if (!e.order_id) return;
    logger.info('order completed; fetching verified result', { orderId: e.order_id });
    try {
      const delivery = await client.getDelivery(e.order_id);
      if (delivery.deliverableType === DeliverableType.Schema) {
        const report = VerificationReportSchema.parse(JSON.parse(delivery.deliverableSchema));
        logger.info('received verification report', {
          trustScore: report.trustScore,
          counts: report.counts,
          contentHash: report.provenance.contentHash,
          onChainContentHash: delivery.contentHash,
        });
        process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      }
    } catch (err) {
      logger.error('failed to read delivery', { error: msg(err) });
    } finally {
      stream.close();
      process.exit(0);
    }
  });

  const negotiation = await client.negotiateOrder({
    serviceId,
    requirements: JSON.stringify(request),
  });
  logger.info('negotiation opened with Veritas', {
    negotiationId: negotiation.negotiationId,
  });
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

main().catch((err) => {
  process.stderr.write(`${msg(err)}\n`);
  process.exit(1);
});
