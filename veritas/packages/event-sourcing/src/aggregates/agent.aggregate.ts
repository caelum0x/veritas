// Agent aggregate: manages trust, endpoint, and key state for a CAP agent.
import { ValidationError } from "@veritas/core";
import { AggregateRoot } from "../aggregate-root.js";
import type { StoredEvent } from "../domain-event.js";
import {
  AGENT_REGISTERED,
  AGENT_ENDPOINT_UPDATED,
  AGENT_PUBLIC_KEY_UPDATED,
  AGENT_TRUSTED,
  AGENT_UNTRUSTED,
  AGENT_METADATA_UPDATED,
  AGENT_DEACTIVATED,
} from "./agent.events.js";
import type {
  AgentRegisteredPayload,
  AgentEndpointUpdatedPayload,
  AgentPublicKeyUpdatedPayload,
  AgentTrustedPayload,
  AgentUntrustedPayload,
  AgentMetadataUpdatedPayload,
  AgentDeactivatedPayload,
} from "./agent.events.js";

export class AgentAggregate extends AggregateRoot {
  readonly aggregateType = "Agent" as const;

  private _id: string = "";
  private _name: string = "";
  private _walletAddress: string = "";
  private _endpoint: string | null = null;
  private _publicKey: string | null = null;
  private _trusted: boolean = false;
  private _metadata: Record<string, unknown> = {};
  private _active: boolean = false;

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get walletAddress(): string { return this._walletAddress; }
  get endpoint(): string | null { return this._endpoint; }
  get publicKey(): string | null { return this._publicKey; }
  get trusted(): boolean { return this._trusted; }
  get metadata(): Record<string, unknown> { return this._metadata; }
  get active(): boolean { return this._active; }

  static register(
    agentId: string,
    name: string,
    walletAddress: string,
    endpoint: string | null = null,
    publicKey: string | null = null,
    trusted: boolean = false,
    metadata: Record<string, unknown> = {}
  ): AgentAggregate {
    const agg = new AgentAggregate();
    agg._id = agentId;
    const payload: AgentRegisteredPayload = {
      agentId,
      name,
      walletAddress,
      endpoint,
      publicKey,
      trusted,
      metadata,
    };
    agg.raise(AGENT_REGISTERED, payload);
    return agg;
  }

  updateEndpoint(endpoint: string | null): void {
    if (!this._active) {
      throw new ValidationError({ message: "Cannot update endpoint of a deactivated agent" });
    }
    const payload: AgentEndpointUpdatedPayload = { endpoint };
    this.raise(AGENT_ENDPOINT_UPDATED, payload);
  }

  updatePublicKey(publicKey: string | null): void {
    if (!this._active) {
      throw new ValidationError({ message: "Cannot update public key of a deactivated agent" });
    }
    const payload: AgentPublicKeyUpdatedPayload = { publicKey };
    this.raise(AGENT_PUBLIC_KEY_UPDATED, payload);
  }

  trust(trustedAt: string): void {
    if (!this._active) {
      throw new ValidationError({ message: "Cannot trust a deactivated agent" });
    }
    if (this._trusted) {
      throw new ValidationError({ message: "Agent is already trusted" });
    }
    const payload: AgentTrustedPayload = { trustedAt };
    this.raise(AGENT_TRUSTED, payload);
  }

  untrust(untrustedAt: string): void {
    if (!this._active) {
      throw new ValidationError({ message: "Cannot untrust a deactivated agent" });
    }
    if (!this._trusted) {
      throw new ValidationError({ message: "Agent is not trusted" });
    }
    const payload: AgentUntrustedPayload = { untrustedAt };
    this.raise(AGENT_UNTRUSTED, payload);
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    if (!this._active) {
      throw new ValidationError({ message: "Cannot update metadata of a deactivated agent" });
    }
    const payload: AgentMetadataUpdatedPayload = { metadata };
    this.raise(AGENT_METADATA_UPDATED, payload);
  }

  deactivate(reason: string, deactivatedAt: string): void {
    if (!this._active) {
      throw new ValidationError({ message: "Agent is already deactivated" });
    }
    const payload: AgentDeactivatedPayload = { reason, deactivatedAt };
    this.raise(AGENT_DEACTIVATED, payload);
  }

  apply(event: StoredEvent): void {
    switch (event.eventType) {
      case AGENT_REGISTERED: {
        const p = event.payload as AgentRegisteredPayload;
        this._id = p.agentId;
        this._name = p.name;
        this._walletAddress = p.walletAddress;
        this._endpoint = p.endpoint;
        this._publicKey = p.publicKey;
        this._trusted = p.trusted;
        this._metadata = p.metadata;
        this._active = true;
        break;
      }
      case AGENT_ENDPOINT_UPDATED: {
        const p = event.payload as AgentEndpointUpdatedPayload;
        this._endpoint = p.endpoint;
        break;
      }
      case AGENT_PUBLIC_KEY_UPDATED: {
        const p = event.payload as AgentPublicKeyUpdatedPayload;
        this._publicKey = p.publicKey;
        break;
      }
      case AGENT_TRUSTED: {
        this._trusted = true;
        break;
      }
      case AGENT_UNTRUSTED: {
        this._trusted = false;
        break;
      }
      case AGENT_METADATA_UPDATED: {
        const p = event.payload as AgentMetadataUpdatedPayload;
        this._metadata = p.metadata;
        break;
      }
      case AGENT_DEACTIVATED: {
        this._active = false;
        break;
      }
    }
  }
}
