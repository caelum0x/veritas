// Feed registry: manage registration and lookup of oracle feed descriptors

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { FeedNotFoundError, FeedRegistryError } from "./errors.js";

/** Supported quote currency denominations */
export type QuoteCurrency = "USD" | "ETH" | "BTC" | "EUR";

/** Describes a registered oracle feed */
export interface FeedDescriptor {
  readonly feedId: string;
  readonly baseCurrency: string;
  readonly quoteCurrency: QuoteCurrency;
  readonly decimals: number;
  readonly description: string;
  readonly active: boolean;
}

/** Schema for validating a feed descriptor */
export const feedDescriptorSchema = z.object({
  feedId: z.string().min(1),
  baseCurrency: z.string().min(1),
  quoteCurrency: z.enum(["USD", "ETH", "BTC", "EUR"]),
  decimals: z.number().int().min(0).max(18),
  description: z.string(),
  active: z.boolean(),
});

/** Port interface for a feed registry */
export interface FeedRegistry {
  register(descriptor: FeedDescriptor): Result<FeedDescriptor, FeedRegistryError>;
  deregister(feedId: string): Result<void, FeedNotFoundError>;
  get(feedId: string): Result<FeedDescriptor, FeedNotFoundError>;
  listActive(): readonly FeedDescriptor[];
  listAll(): readonly FeedDescriptor[];
  has(feedId: string): boolean;
}

/** In-memory implementation of FeedRegistry */
export class InMemoryFeedRegistry implements FeedRegistry {
  private readonly feeds: Map<string, FeedDescriptor> = new Map();

  register(descriptor: FeedDescriptor): Result<FeedDescriptor, FeedRegistryError> {
    const parsed = feedDescriptorSchema.safeParse(descriptor);
    if (!parsed.success) {
      return err(new FeedRegistryError(`Invalid descriptor: ${parsed.error.message}`));
    }
    const frozen = Object.freeze(parsed.data);
    this.feeds.set(frozen.feedId, frozen);
    return ok(frozen);
  }

  deregister(feedId: string): Result<void, FeedNotFoundError> {
    if (!this.feeds.has(feedId)) {
      return err(new FeedNotFoundError(feedId));
    }
    this.feeds.delete(feedId);
    return ok(undefined);
  }

  get(feedId: string): Result<FeedDescriptor, FeedNotFoundError> {
    const feed = this.feeds.get(feedId);
    if (feed === undefined) {
      return err(new FeedNotFoundError(feedId));
    }
    return ok(feed);
  }

  listActive(): readonly FeedDescriptor[] {
    return Array.from(this.feeds.values()).filter((f) => f.active);
  }

  listAll(): readonly FeedDescriptor[] {
    return Array.from(this.feeds.values());
  }

  has(feedId: string): boolean {
    return this.feeds.has(feedId);
  }
}

/** Build a canonical feed ID from base/quote pair */
export function buildFeedId(baseCurrency: string, quoteCurrency: QuoteCurrency): string {
  return `${baseCurrency.toUpperCase()}/${quoteCurrency}`;
}
