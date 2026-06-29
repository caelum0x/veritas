import {
  AgentClient,
  DeliverableType,
  EventType,
  type Event,
  type EventStream,
  type Logger,
} from '@croo-network/sdk';
import type { AppConfig } from '../config.js';
import { runVerification, type EngineOptions } from '../verify/engine.js';
import {
  VerificationRequestSchema,
  type VerificationRequest,
} from '../verify/schema.js';

export interface ProviderDeps {
  client: AgentClient;
  config: AppConfig;
  logger: Logger;
  /** Everything the engine needs except the per-call request. */
  engine: Omit<EngineOptions, never>;
}

/**
 * The Veritas provider runtime. It walks every job through the CAP lifecycle:
 *
 *   NegotiationCreated -> validate requirements -> accept (or reject if invalid)
 *   OrderPaid          -> run verification      -> deliver schema result
 *   OrderCompleted     -> settled on-chain      -> done
 *
 * Validating at negotiation time means a buyer never pays for malformed input —
 * we reject before funds enter escrow.
 */
export class VeritasProvider {
  private readonly client: AgentClient;
  private readonly config: AppConfig;
  private readonly logger: Logger;
  private readonly engine: ProviderDeps['engine'];
  private stream?: EventStream;

  /** orderId -> validated request, captured at accept time for the deliver step. */
  private readonly pending = new Map<string, VerificationRequest>();

  constructor(deps: ProviderDeps) {
    this.client = deps.client;
    this.config = deps.config;
    this.logger = deps.logger;
    this.engine = deps.engine;
  }

  async start(): Promise<void> {
    this.stream = await this.client.connectWebSocket();
    this.logger.info('veritas provider online; awaiting jobs', {
      model: this.config.verify.model,
    });

    this.stream.on(EventType.NegotiationCreated, (e) => this.onNegotiation(e));
    this.stream.on(EventType.OrderPaid, (e) => this.onOrderPaid(e));
    this.stream.on(EventType.OrderCompleted, (e) =>
      this.logger.info('order settled on-chain', { orderId: e.order_id }),
    );
    this.stream.on(EventType.OrderRejected, (e) => this.cleanup(e.order_id));
    this.stream.on(EventType.OrderExpired, (e) => this.cleanup(e.order_id));
  }

  stop(): void {
    this.stream?.close();
    this.logger.info('veritas provider stopped');
  }

  // ------------------------------------------------------------------ events

  private async onNegotiation(e: Event): Promise<void> {
    const negotiationId = e.negotiation_id;
    if (!negotiationId) return;

    let requirementsRaw: string;
    try {
      const negotiation = await this.client.getNegotiation(negotiationId);
      requirementsRaw = negotiation.requirements;
    } catch (err) {
      this.logger.error('failed to load negotiation', {
        negotiationId,
        error: errMsg(err),
      });
      return;
    }

    const parsed = parseRequest(requirementsRaw);
    if (!parsed.ok) {
      this.logger.warn('rejecting negotiation: invalid requirements', {
        negotiationId,
        reason: parsed.error,
      });
      await this.safe(() => this.client.rejectNegotiation(negotiationId, parsed.error));
      return;
    }

    try {
      const result = await this.client.acceptNegotiation(negotiationId);
      this.pending.set(result.order.orderId, parsed.value);
      this.logger.info('accepted negotiation', {
        negotiationId,
        orderId: result.order.orderId,
      });
    } catch (err) {
      this.logger.error('failed to accept negotiation', {
        negotiationId,
        error: errMsg(err),
      });
    }
  }

  private async onOrderPaid(e: Event): Promise<void> {
    const orderId = e.order_id;
    if (!orderId) return;

    const request = await this.resolveRequest(orderId);
    if (!request) {
      this.logger.error('cannot resolve request for paid order; rejecting', { orderId });
      await this.safe(() =>
        this.client.rejectOrder(orderId, 'Provider could not reconstruct the verification request.'),
      );
      return;
    }

    this.logger.info('order paid; verifying', { orderId });
    try {
      const report = await runVerification(request, this.engine);
      const result = await this.client.deliverOrder(orderId, {
        deliverableType: DeliverableType.Schema,
        deliverableSchema: JSON.stringify(report),
      });
      this.logger.info('delivered verification report', {
        orderId,
        deliveryId: result.delivery.deliveryId,
        contentHash: report.provenance.contentHash,
        trustScore: report.trustScore,
        txHash: result.txHash,
      });
    } catch (err) {
      this.logger.error('verification/delivery failed', { orderId, error: errMsg(err) });
      await this.safe(() =>
        this.client.rejectOrder(orderId, 'Verification failed; escrow released to requester.'),
      );
    } finally {
      this.pending.delete(orderId);
    }
  }

  // ----------------------------------------------------------------- helpers

  /** Prefer the in-memory request; fall back to re-fetching the negotiation. */
  private async resolveRequest(orderId: string): Promise<VerificationRequest | undefined> {
    const cached = this.pending.get(orderId);
    if (cached) return cached;
    try {
      const order = await this.client.getOrder(orderId);
      const negotiation = await this.client.getNegotiation(order.negotiationId);
      const parsed = parseRequest(negotiation.requirements);
      return parsed.ok ? parsed.value : undefined;
    } catch (err) {
      this.logger.error('request fallback resolution failed', { orderId, error: errMsg(err) });
      return undefined;
    }
  }

  private cleanup(orderId?: string): void {
    if (orderId) this.pending.delete(orderId);
  }

  private async safe(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.error('recovery action failed', { error: errMsg(err) });
    }
  }
}

type ParseResult =
  | { ok: true; value: VerificationRequest }
  | { ok: false; error: string };

/** Parse + validate a CAP `requirements` string into a VerificationRequest. */
export function parseRequest(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'requirements must be valid JSON' };
  }
  const parsed = VerificationRequestSchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    return { ok: false, error: `invalid requirements: ${msg}` };
  }
  return { ok: true, value: parsed.data };
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
