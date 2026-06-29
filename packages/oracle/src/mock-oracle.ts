// Mock oracle: in-memory oracle implementation for testing and local development

import { type Result, ok, err } from "@veritas/core";
import { makeRound, updateRound, type FeedRound } from "./round.js";
import { checkStaleness, type StalenessConfig, DEFAULT_STALENESS_CONFIG } from "./staleness.js";
import { FeedNotFoundError, NoAnswerError, RoundNotFoundError, StaleDataError } from "./errors.js";

/** Options for constructing a MockOracle */
export interface MockOracleOptions {
  readonly stalenessConfig?: StalenessConfig;
  /** Override clock: returns current unix seconds */
  readonly nowFn?: () => number;
}

/** Mutable state for a single feed within the mock */
interface FeedState {
  latestRound: FeedRound;
  history: FeedRound[];
  nextRoundId: number;
}

/** Full in-memory oracle; answers can be pushed via pushAnswer */
export class MockOracle {
  private readonly feeds: Map<string, FeedState> = new Map();
  private readonly stalenessConfig: StalenessConfig;
  private readonly nowFn: () => number;

  constructor(options: MockOracleOptions = {}) {
    this.stalenessConfig = options.stalenessConfig ?? DEFAULT_STALENESS_CONFIG;
    this.nowFn = options.nowFn ?? (() => Math.floor(Date.now() / 1000));
  }

  /** Seed a feed with an initial answer; creates the feed if absent */
  pushAnswer(feedId: string, answer: bigint): FeedRound {
    const now = this.nowFn();
    const existing = this.feeds.get(feedId);
    if (existing === undefined) {
      const round = makeRound(feedId, 1, answer, now);
      this.feeds.set(feedId, { latestRound: round, history: [round], nextRoundId: 2 });
      return round;
    }
    const roundId = existing.nextRoundId;
    const round = makeRound(feedId, roundId, answer, now);
    const updated: FeedState = {
      latestRound: round,
      history: [...existing.history, round],
      nextRoundId: roundId + 1,
    };
    this.feeds.set(feedId, updated);
    return round;
  }

  /** Get the latest round for a feed (stale check included) */
  getLatestRound(feedId: string): Result<FeedRound, FeedNotFoundError | StaleDataError | NoAnswerError> {
    const state = this.feeds.get(feedId);
    if (state === undefined) {
      return err(new FeedNotFoundError(feedId));
    }
    return checkStaleness(state.latestRound, this.nowFn(), this.stalenessConfig);
  }

  /** Get a specific historical round by roundId */
  getRound(feedId: string, roundId: number): Result<FeedRound, FeedNotFoundError | RoundNotFoundError> {
    const state = this.feeds.get(feedId);
    if (state === undefined) {
      return err(new FeedNotFoundError(feedId));
    }
    const round = state.history.find((r) => r.roundId === roundId);
    if (round === undefined) {
      return err(new RoundNotFoundError(feedId, roundId));
    }
    return ok(round);
  }

  /** Get all rounds for a feed ordered ascending by roundId */
  getRoundHistory(feedId: string): Result<readonly FeedRound[], FeedNotFoundError> {
    const state = this.feeds.get(feedId);
    if (state === undefined) {
      return err(new FeedNotFoundError(feedId));
    }
    return ok([...state.history].sort((a, b) => a.roundId - b.roundId));
  }

  /** Remove a feed entirely (useful for reset in tests) */
  removeFeed(feedId: string): void {
    this.feeds.delete(feedId);
  }

  /** List all registered feed IDs */
  feedIds(): readonly string[] {
    return Array.from(this.feeds.keys());
  }

  /** Force-mark a feed as stale by backdating its updatedAt */
  makeStale(feedId: string, ageSeconds: number): Result<void, FeedNotFoundError> {
    const state = this.feeds.get(feedId);
    if (state === undefined) {
      return err(new FeedNotFoundError(feedId));
    }
    const now = this.nowFn();
    const stalUpdatedAt = now - ageSeconds;
    const staleRound = updateRound(state.latestRound, state.latestRound.answer, stalUpdatedAt);
    this.feeds.set(feedId, { ...state, latestRound: staleRound });
    return ok(undefined);
  }
}
