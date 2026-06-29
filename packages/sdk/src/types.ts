// Public SDK types: option bags, resource shapes, and A2A flow types.
import type { z } from "zod";
import type {
  OrderSchema,
  DeliverySchema,
  VerificationReportSchema,
  AgentSchema,
  ServiceSchema,
} from "@veritas/contracts";

/** Resolved order from the API. */
export type Order = z.infer<typeof OrderSchema>;

/** Delivery record from the API. */
export type Delivery = z.infer<typeof DeliverySchema>;

/** Full verification report. */
export type VerificationReport = z.infer<typeof VerificationReportSchema>;

/** Agent record. */
export type Agent = z.infer<typeof AgentSchema>;

/** Service record. */
export type Service = z.infer<typeof ServiceSchema>;

/** Options for polling order completion. */
export interface WaitForCompletionOptions {
  /** How often to poll in milliseconds. Defaults to 3000. */
  pollIntervalMs?: number;
  /** Maximum total wait time in milliseconds. Defaults to 300_000 (5 min). */
  timeoutMs?: number;
  /** Called on each poll with the current order state. */
  onPoll?: (order: Order) => void;
}

/** The result of a completed CAP hire + verification flow. */
export interface HireResult {
  /** The order created for the hire. */
  order: Order;
  /** The delivery associated with the completed order, if available. */
  delivery: Delivery | null;
  /** Parsed verification report from the delivery payload, if available. */
  report: VerificationReport | null;
}

/** Options for hiring Veritas via CAP. */
export interface CapHireOptions {
  /** The service ID to hire (Veritas agent service). */
  serviceId: string;
  /** The claim text or content to verify. */
  claim: string;
  /** USDC amount to pay (in smallest unit / cents). */
  amountUsdc: string;
  /** Buyer wallet address. */
  buyerAddress: string;
  /** Optional metadata to pass to the agent. */
  metadata?: Record<string, unknown>;
  /** Completion polling options. */
  completion?: WaitForCompletionOptions;
}

/** Pagination cursor options for list endpoints. */
export interface CursorPageOptions {
  cursor?: string;
  limit?: number;
}

/** A typed page of results. */
export interface SdkPage<T> {
  data: ReadonlyArray<T>;
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}
