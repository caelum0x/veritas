// Price feed: specialised DataFeed for currency-pair price data with decimal conversion.
import { ok, err, type Result } from "@veritas/core";
import type { FeedId, FeedAnswer, FeedMeta } from "./types.js";
import { feedId } from "./types.js";
import { createFeed, type DataFeed } from "./feed.js";
import { FeedNotFoundError } from "./errors.js";

/** Human-readable price extracted from a raw bigint answer. */
export interface Price {
  readonly feedId: FeedId;
  readonly value: number;
  readonly decimals: number;
  readonly updatedAt: number;
  readonly roundId: bigint;
}

/** Convert a raw bigint oracle answer to a floating-point Price. */
export function toPrice(answer: FeedAnswer): Price {
  const divisor = 10 ** answer.decimals;
  return {
    feedId: answer.feedId,
    value: Number(answer.answer) / divisor,
    decimals: answer.decimals,
    updatedAt: answer.updatedAt,
    roundId: answer.roundId,
  };
}

/** A price feed is a DataFeed that additionally exposes a typed price helper. */
export interface PriceFeed extends DataFeed {
  /** Return the latest price as a human-readable float or err if unavailable. */
  getLatestPrice(): Result<Price>;
}

/** Create a price feed from pair components (e.g. "ETH", "USD"). */
export function createPriceFeed(
  base: string,
  quote: string,
  decimals: number,
  heartbeatSeconds = 3600,
): PriceFeed {
  const id = feedId(`${base}/${quote}`);
  const meta: FeedMeta = {
    feedId: id,
    description: `${base} / ${quote} price feed`,
    decimals,
    heartbeatSeconds,
    deviationThresholdBps: 50,
  };
  return buildPriceFeed(createFeed(meta));
}

function buildPriceFeed(inner: DataFeed): PriceFeed {
  return {
    ...inner,
    getLatestPrice(): Result<Price> {
      const result = inner.getLatestAnswer();
      if (!result.ok) return result as Result<Price>;
      return ok(toPrice(result.value));
    },
    updateAnswer(answer: FeedAnswer): PriceFeed {
      return buildPriceFeed(inner.updateAnswer(answer));
    },
  };
}

/** Convenience: resolve a price feed by pair string from a map. */
export function getPriceFeedForPair(
  feeds: Readonly<Map<FeedId, PriceFeed>>,
  base: string,
  quote: string,
): Result<PriceFeed> {
  const id = feedId(`${base}/${quote}`);
  const feed = feeds.get(id);
  if (feed === undefined) {
    return err(new FeedNotFoundError(`${base}/${quote}`));
  }
  return ok(feed);
}
