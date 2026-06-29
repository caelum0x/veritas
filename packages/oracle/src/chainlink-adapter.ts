// Chainlink-style adapter: port interface modelling a Chainlink AggregatorV3 data source.
import { ok, err, type Result } from "@veritas/core";
import type { FeedId, FeedAnswer, FeedMeta } from "./types.js";
import type { OraclePort } from "./oracle.js";
import { FeedNotFoundError, OracleUnavailableError } from "./errors.js";

/** Raw round data returned by a Chainlink AggregatorV3 call. */
export interface ChainlinkRoundData {
  readonly roundId: bigint;
  readonly answer: bigint;
  readonly startedAt: bigint;
  readonly updatedAt: bigint;
  readonly answeredInRound: bigint;
}

/** Port for a Chainlink AggregatorV3 contract surface (stub for on-chain calls). */
export interface ChainlinkAggregatorPort {
  latestRoundData(): Promise<ChainlinkRoundData>;
  getRoundData(roundId: bigint): Promise<ChainlinkRoundData>;
  decimals(): Promise<number>;
  description(): Promise<string>;
}

/** Config for binding a single Chainlink aggregator to a feed id. */
export interface ChainlinkFeedConfig {
  readonly feedId: FeedId;
  readonly aggregator: ChainlinkAggregatorPort;
  readonly heartbeatSeconds: number;
  readonly deviationThresholdBps: number;
}

/** OraclePort implementation backed by one or more Chainlink AggregatorV3 ports. */
export function createChainlinkAdapter(
  feeds: readonly ChainlinkFeedConfig[],
): OraclePort {
  const feedMap = new Map(feeds.map((f) => [f.feedId, f]));

  async function resolveFeed(feedId: FeedId): Promise<Result<ChainlinkFeedConfig>> {
    const config = feedMap.get(feedId);
    if (config === undefined) return err(new FeedNotFoundError(feedId));
    return ok(config);
  }

  async function toFeedAnswer(
    feedId: FeedId,
    decimals: number,
    raw: ChainlinkRoundData,
  ): Promise<FeedAnswer> {
    return {
      feedId,
      roundId: raw.roundId,
      answer: raw.answer,
      decimals,
      updatedAt: Number(raw.updatedAt),
      startedAt: Number(raw.startedAt),
    };
  }

  return {
    async getLatestAnswer(feedId: FeedId): Promise<Result<FeedAnswer>> {
      const cfg = await resolveFeed(feedId);
      if (!cfg.ok) return cfg as Result<FeedAnswer>;
      try {
        const [raw, decimals] = await Promise.all([
          cfg.value.aggregator.latestRoundData(),
          cfg.value.aggregator.decimals(),
        ]);
        return ok(await toFeedAnswer(feedId, decimals, raw));
      } catch (cause) {
        return err(new OracleUnavailableError(cause));
      }
    },

    async getAnswerAtRound(feedId: FeedId, roundId: bigint): Promise<Result<FeedAnswer>> {
      const cfg = await resolveFeed(feedId);
      if (!cfg.ok) return cfg as Result<FeedAnswer>;
      try {
        const [raw, decimals] = await Promise.all([
          cfg.value.aggregator.getRoundData(roundId),
          cfg.value.aggregator.decimals(),
        ]);
        return ok(await toFeedAnswer(feedId, decimals, raw));
      } catch (cause) {
        return err(new OracleUnavailableError(cause));
      }
    },

    async listFeeds(): Promise<Result<readonly FeedId[]>> {
      return ok([...feedMap.keys()]);
    },

    async getFeedMeta(feedId: FeedId): Promise<Result<FeedMeta>> {
      const cfg = await resolveFeed(feedId);
      if (!cfg.ok) return cfg as Result<FeedMeta>;
      try {
        const [decimals, description] = await Promise.all([
          cfg.value.aggregator.decimals(),
          cfg.value.aggregator.description(),
        ]);
        const meta: FeedMeta = {
          feedId,
          description,
          decimals,
          heartbeatSeconds: cfg.value.heartbeatSeconds,
          deviationThresholdBps: cfg.value.deviationThresholdBps,
        };
        return ok(meta);
      } catch (cause) {
        return err(new OracleUnavailableError(cause));
      }
    },
  };
}
