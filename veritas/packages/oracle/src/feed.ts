// Data feed abstraction: defines a single observable data stream from an oracle.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { FeedId, FeedAnswer, FeedMeta } from "./types.js";
import { FeedNotFoundError } from "./errors.js";

/** A data feed wraps a feed id and its metadata with a convenience accessor. */
export interface DataFeed {
  readonly meta: FeedMeta;
  /** Return the most recent answer held in memory, or err if none available. */
  getLatestAnswer(): Result<FeedAnswer>;
  /** Accept a new answer, replacing the previous one (immutable swap). */
  updateAnswer(answer: FeedAnswer): DataFeed;
}

/** Internal state for a DataFeed instance. */
interface FeedState {
  readonly meta: FeedMeta;
  readonly latest: FeedAnswer | undefined;
}

/** Create a new DataFeed from feed metadata. */
export function createFeed(meta: FeedMeta): DataFeed {
  return buildFeed({ meta, latest: undefined });
}

function buildFeed(state: FeedState): DataFeed {
  return {
    meta: state.meta,
    getLatestAnswer(): Result<FeedAnswer> {
      if (state.latest === undefined) {
        return err(new FeedNotFoundError(state.meta.feedId));
      }
      return ok(state.latest);
    },
    updateAnswer(answer: FeedAnswer): DataFeed {
      return buildFeed({ ...state, latest: answer });
    },
  };
}

/** Map of feedId → DataFeed for holding multiple feeds. */
export type FeedMap = Readonly<Map<FeedId, DataFeed>>;

/** Lookup a feed by id, returning err if not registered. */
export function lookupFeed(
  feeds: FeedMap,
  feedId: FeedId,
): Result<DataFeed> {
  const feed = feeds.get(feedId);
  if (feed === undefined) {
    return err(new FeedNotFoundError(feedId));
  }
  return ok(feed);
}
