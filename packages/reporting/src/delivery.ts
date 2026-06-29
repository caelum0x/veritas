// Delivers rendered reports to recipients via in-memory channel — port interface pattern.
import { z } from "zod";
import { newId, ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { RenderedReport } from "./renderer.js";

export type DeliveryId = string & { readonly __brand: "DeliveryId" };

export const DeliveryChannelSchema = z.enum(["email", "webhook", "download", "s3", "in_app"]);
export type DeliveryChannel = z.infer<typeof DeliveryChannelSchema>;

export const DeliveryStatusSchema = z.enum(["pending", "sent", "failed", "retrying"]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

export interface DeliveryTarget {
  readonly channel: DeliveryChannel;
  readonly address: string; // email addr, webhook URL, S3 key, or user id
  readonly metadata?: Record<string, string>;
}

export interface Delivery {
  readonly id: DeliveryId;
  readonly reportId: string;
  readonly target: DeliveryTarget;
  readonly status: DeliveryStatus;
  readonly attempts: number;
  readonly lastError?: string;
  readonly deliveredAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DeliveryError {
  readonly code: string;
  readonly message: string;
}

/** Port interface — swap in-memory impl for real channel adapters. */
export interface DeliveryPort {
  send(rendered: RenderedReport, target: DeliveryTarget): Promise<Result<Delivery, DeliveryError>>;
  getDelivery(id: DeliveryId): Promise<Delivery | undefined>;
  listDeliveries(reportId: string): Promise<readonly Delivery[]>;
}

function makeDelivery(
  reportId: string,
  target: DeliveryTarget,
  status: DeliveryStatus,
  lastError?: string
): Delivery {
  const now = new Date().toISOString();
  return {
    id: newId("delivery") as unknown as DeliveryId,
    reportId,
    target,
    status,
    attempts: 1,
    lastError,
    deliveredAt: status === "sent" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/** In-memory delivery adapter — stores deliveries in a plain Map. */
export class InMemoryDeliveryPort implements DeliveryPort {
  readonly #store = new Map<DeliveryId, Delivery>();
  // Simulate failure for specific channels in tests via this set.
  readonly #failChannels: Set<DeliveryChannel>;

  constructor(failChannels: readonly DeliveryChannel[] = []) {
    this.#failChannels = new Set(failChannels);
  }

  async send(
    rendered: RenderedReport,
    target: DeliveryTarget
  ): Promise<Result<Delivery, DeliveryError>> {
    if (this.#failChannels.has(target.channel)) {
      const delivery = makeDelivery(
        rendered.reportId,
        target,
        "failed",
        `Channel ${target.channel} is unavailable`
      );
      this.#store.set(delivery.id, delivery);
      return err({ code: "CHANNEL_UNAVAILABLE", message: delivery.lastError! });
    }

    const delivery = makeDelivery(rendered.reportId, target, "sent");
    this.#store.set(delivery.id, delivery);
    return ok(delivery);
  }

  async getDelivery(id: DeliveryId): Promise<Delivery | undefined> {
    return this.#store.get(id);
  }

  async listDeliveries(reportId: string): Promise<readonly Delivery[]> {
    return [...this.#store.values()].filter((d) => d.reportId === reportId);
  }
}

/** Deliver a report to multiple targets, collecting results for each. */
export async function deliverToTargets(
  rendered: RenderedReport,
  targets: readonly DeliveryTarget[],
  port: DeliveryPort
): Promise<readonly Result<Delivery, DeliveryError>[]> {
  return Promise.all(targets.map((t) => port.send(rendered, t)));
}
