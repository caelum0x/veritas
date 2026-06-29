// Fluent builder for constructing outgoing webhook event envelopes.

import { newId, epochToIso, type IsoTimestamp } from "@veritas/core";
import type { WebhookEvent } from "./types.js";

/** Default API version emitted by the builder. */
const DEFAULT_API_VERSION = "1";

/** Options accepted by WebhookEventBuilder.build(). */
export interface BuildOptions {
  /** Override the generated event ID. */
  id?: string;
  /** Override the generated creation timestamp. */
  createdAt?: IsoTimestamp;
}

/**
 * Builds an immutable WebhookEvent envelope.
 * Chain setters to configure the event, then call build() to produce the payload.
 */
export class WebhookEventBuilder {
  private _type: string | undefined;
  private _data: Record<string, unknown> = {};
  private _apiVersion: string = DEFAULT_API_VERSION;
  private _subscriptionId: string | undefined;
  private _organizationId: string | undefined;

  /** Set the event type (required). */
  type(type: string): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)) as this, {
      ...this,
      _type: type,
    });
  }

  /** Set the event payload data (required). */
  data(data: Record<string, unknown>): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)) as this, {
      ...this,
      _data: { ...data },
    });
  }

  /** Set the API version string (default: "1"). */
  apiVersion(version: string): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)) as this, {
      ...this,
      _apiVersion: version,
    });
  }

  /** Associate a subscription ID with the event envelope. */
  subscriptionId(id: string): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)) as this, {
      ...this,
      _subscriptionId: id,
    });
  }

  /** Associate an organization ID with the event envelope. */
  organizationId(id: string): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)) as this, {
      ...this,
      _organizationId: id,
    });
  }

  /**
   * Produce the final immutable WebhookEvent.
   * Throws if type has not been set.
   */
  build(options: BuildOptions = {}): WebhookEvent {
    if (!this._type) {
      throw new Error("WebhookEventBuilder: event type is required");
    }
    return Object.freeze({
      id: options.id ?? newId("whe"),
      type: this._type,
      timestamp: options.createdAt ?? epochToIso(Date.now()),
      version: "1" as const,
      deliveryId: newId("del"),
      subscriptionId: this._subscriptionId ?? "",
      attempt: 1,
      payload: { ...this._data },
    }) as unknown as WebhookEvent;
  }
}

/** Convenience factory — equivalent to `new WebhookEventBuilder()`. */
export function createEventBuilder(): WebhookEventBuilder {
  return new WebhookEventBuilder();
}
