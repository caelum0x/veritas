// Webhook aggregate root managing delivery tracking and lifecycle.
import { AggregateRoot } from "../aggregate-root.js";
import type { StoredEvent } from "../domain-event.js";
import { WEBHOOK_EVENT_TYPES } from "./webhook.events.js";
import type {
  WebhookCreatedPayload,
  WebhookUpdatedPayload,
  WebhookDisabledPayload,
  WebhookEnabledPayload,
  WebhookDeletedPayload,
  DeliveryAttemptedPayload,
  DeliverySucceededPayload,
  DeliveryFailedPayload,
  SecretRotatedPayload,
} from "./webhook.events.js";
import type { WebhookDeliveryStatus } from "@veritas/contracts";

export type WebhookStatus = "active" | "disabled" | "deleted";

export interface DeliveryRecord {
  readonly deliveryId: string;
  readonly eventType: string;
  readonly eventId: string;
  readonly attemptNumber: number;
  readonly status: "pending" | "succeeded" | "failed";
  readonly statusCode?: number;
  readonly errorMessage?: string;
  readonly nextRetryAt?: string;
}

export class WebhookAggregate extends AggregateRoot {
  readonly aggregateType = "Webhook";

  private _webhookId: string = "";
  private _organizationId: string = "";
  private _url: string = "";
  private _events: readonly string[] = [];
  private _description: string | undefined;
  private _secret: string = "";
  private _status: WebhookStatus = "active";
  private _deliveries: readonly DeliveryRecord[] = [];

  get id(): string {
    return this._webhookId;
  }

  get organizationId(): string {
    return this._organizationId;
  }

  get url(): string {
    return this._url;
  }

  get subscribedEvents(): readonly string[] {
    return this._events;
  }

  get description(): string | undefined {
    return this._description;
  }

  get secret(): string {
    return this._secret;
  }

  get status(): WebhookStatus {
    return this._status;
  }

  get deliveries(): readonly DeliveryRecord[] {
    return this._deliveries;
  }

  static create(payload: Omit<WebhookCreatedPayload, never>): WebhookAggregate {
    const agg = new WebhookAggregate();
    agg.raise(WEBHOOK_EVENT_TYPES.WEBHOOK_CREATED, payload);
    return agg;
  }

  update(payload: Omit<WebhookUpdatedPayload, "webhookId">): void {
    if (this._status === "deleted") throw new Error("Webhook is deleted");
    this.raise(WEBHOOK_EVENT_TYPES.WEBHOOK_UPDATED, {
      webhookId: this._webhookId,
      ...payload,
    });
  }

  disable(reason?: string): void {
    if (this._status === "deleted") throw new Error("Webhook is deleted");
    if (this._status === "disabled") return;
    this.raise(WEBHOOK_EVENT_TYPES.WEBHOOK_DISABLED, {
      webhookId: this._webhookId,
      reason,
    });
  }

  enable(): void {
    if (this._status === "deleted") throw new Error("Webhook is deleted");
    if (this._status === "active") return;
    this.raise(WEBHOOK_EVENT_TYPES.WEBHOOK_ENABLED, {
      webhookId: this._webhookId,
    });
  }

  delete(): void {
    if (this._status === "deleted") return;
    this.raise(WEBHOOK_EVENT_TYPES.WEBHOOK_DELETED, {
      webhookId: this._webhookId,
    });
  }

  recordDeliveryAttempt(
    payload: Omit<DeliveryAttemptedPayload, "webhookId">
  ): void {
    this.raise(WEBHOOK_EVENT_TYPES.DELIVERY_ATTEMPTED, {
      webhookId: this._webhookId,
      ...payload,
    });
  }

  recordDeliverySuccess(
    payload: Omit<DeliverySucceededPayload, "webhookId">
  ): void {
    this.raise(WEBHOOK_EVENT_TYPES.DELIVERY_SUCCEEDED, {
      webhookId: this._webhookId,
      ...payload,
    });
  }

  recordDeliveryFailure(
    payload: Omit<DeliveryFailedPayload, "webhookId">
  ): void {
    this.raise(WEBHOOK_EVENT_TYPES.DELIVERY_FAILED, {
      webhookId: this._webhookId,
      ...payload,
    });
  }

  rotateSecret(newSecret: string): void {
    if (this._status === "deleted") throw new Error("Webhook is deleted");
    this.raise(WEBHOOK_EVENT_TYPES.SECRET_ROTATED, {
      webhookId: this._webhookId,
      newSecret,
    });
  }

  apply(event: StoredEvent): void {
    switch (event.eventType) {
      case WEBHOOK_EVENT_TYPES.WEBHOOK_CREATED: {
        const p = event.payload as WebhookCreatedPayload;
        this._webhookId = p.webhookId;
        this._organizationId = p.organizationId;
        this._url = p.url;
        this._events = p.events;
        this._description = p.description;
        this._secret = p.secret;
        this._status = "active";
        break;
      }
      case WEBHOOK_EVENT_TYPES.WEBHOOK_UPDATED: {
        const p = event.payload as WebhookUpdatedPayload;
        if (p.url !== undefined) this._url = p.url;
        if (p.events !== undefined) this._events = p.events;
        if (p.description !== undefined) this._description = p.description;
        break;
      }
      case WEBHOOK_EVENT_TYPES.WEBHOOK_DISABLED: {
        this._status = "disabled";
        break;
      }
      case WEBHOOK_EVENT_TYPES.WEBHOOK_ENABLED: {
        this._status = "active";
        break;
      }
      case WEBHOOK_EVENT_TYPES.WEBHOOK_DELETED: {
        this._status = "deleted";
        break;
      }
      case WEBHOOK_EVENT_TYPES.DELIVERY_ATTEMPTED: {
        const p = event.payload as DeliveryAttemptedPayload;
        const record: DeliveryRecord = {
          deliveryId: p.deliveryId,
          eventType: p.eventType,
          eventId: p.eventId,
          attemptNumber: p.attemptNumber,
          status: "pending",
        };
        this._deliveries = [...this._deliveries, record];
        break;
      }
      case WEBHOOK_EVENT_TYPES.DELIVERY_SUCCEEDED: {
        const p = event.payload as DeliverySucceededPayload;
        this._deliveries = this._deliveries.map((d) =>
          d.deliveryId === p.deliveryId
            ? { ...d, status: "succeeded" as const, statusCode: p.statusCode }
            : d
        );
        break;
      }
      case WEBHOOK_EVENT_TYPES.DELIVERY_FAILED: {
        const p = event.payload as DeliveryFailedPayload;
        this._deliveries = this._deliveries.map((d) =>
          d.deliveryId === p.deliveryId
            ? {
                ...d,
                status: "failed" as const,
                statusCode: p.statusCode,
                errorMessage: p.errorMessage,
                nextRetryAt: p.nextRetryAt,
              }
            : d
        );
        break;
      }
      case WEBHOOK_EVENT_TYPES.SECRET_ROTATED: {
        const p = event.payload as SecretRotatedPayload;
        this._secret = p.newSecret;
        break;
      }
    }
  }
}
