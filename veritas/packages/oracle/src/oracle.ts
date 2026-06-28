// Oracle port — abstract interface for external data oracle providers.
import type { Result } from "@veritas/core";
import type { FeedId, FeedAnswer, FeedMeta } from "./types.js";

/** Core oracle port: implementors fetch latest answers from external systems. */
export interface OraclePort {
  /** Fetch the latest answer for a given feed id. */
  getLatestAnswer(feedId: FeedId): Promise<Result<FeedAnswer>>;
  /** Fetch a historical answer by round id. */
  getAnswerAtRound(feedId: FeedId, roundId: bigint): Promise<Result<FeedAnswer>>;
  /** List all registered feed ids available from this oracle. */
  listFeeds(): Promise<Result<readonly FeedId[]>>;
  /** Get metadata for a feed including decimals and heartbeat. */
  getFeedMeta(feedId: FeedId): Promise<Result<FeedMeta>>;
}

/** Named oracle instance carrying an identifier alongside the port. */
export interface NamedOracle {
  readonly name: string;
  readonly oracle: OraclePort;
}

/** Factory type for creating oracle port implementations. */
export type OracleFactory = (config: Record<string, unknown>) => OraclePort;
