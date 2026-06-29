// In-memory campaign store providing CRUD operations for Campaign records.

import { ok, err, type Result } from "@veritas/core";
import type { Campaign } from "./campaign.js";
import { CampaignNotFoundError, CampaignConflictError } from "./errors.js";

export interface CampaignStore {
  get(id: string): Result<Campaign, CampaignNotFoundError>;
  list(orgId?: string): ReadonlyArray<Campaign>;
  save(campaign: Campaign): Result<Campaign, CampaignConflictError>;
  update(campaign: Campaign): Result<Campaign, CampaignNotFoundError>;
  remove(id: string): Result<void, CampaignNotFoundError>;
}

/** In-process campaign store backed by a Map. Not thread-safe; for single-process use. */
export class InMemoryCampaignStore implements CampaignStore {
  private readonly data = new Map<string, Campaign>();

  get(id: string): Result<Campaign, CampaignNotFoundError> {
    const campaign = this.data.get(id);
    if (campaign === undefined) {
      return err(new CampaignNotFoundError(id));
    }
    return ok(campaign);
  }

  list(orgId?: string): ReadonlyArray<Campaign> {
    const all = [...this.data.values()];
    return orgId === undefined ? all : all.filter((c) => c.orgId === orgId);
  }

  save(campaign: Campaign): Result<Campaign, CampaignConflictError> {
    if (this.data.has(campaign.id)) {
      return err(
        new CampaignConflictError(
          `Campaign with id "${campaign.id}" already exists`,
        ),
      );
    }
    this.data.set(campaign.id, campaign);
    return ok(campaign);
  }

  update(campaign: Campaign): Result<Campaign, CampaignNotFoundError> {
    if (!this.data.has(campaign.id)) {
      return err(new CampaignNotFoundError(campaign.id));
    }
    this.data.set(campaign.id, campaign);
    return ok(campaign);
  }

  remove(id: string): Result<void, CampaignNotFoundError> {
    if (!this.data.has(id)) {
      return err(new CampaignNotFoundError(id));
    }
    this.data.delete(id);
    return ok(undefined);
  }

  /** Returns the number of campaigns currently stored. */
  size(): number {
    return this.data.size;
  }

  /** Clears all campaigns (useful for testing). */
  clear(): void {
    this.data.clear();
  }
}
