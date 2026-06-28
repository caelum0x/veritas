// Feedback loop — records user signals and exposes per-item score adjustments for re-ranking.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { z } from "zod";
import type { Feedback, FeedbackKind } from "./types.js";
import { FeedbackSchema } from "./types.js";
import { FeedbackError } from "./errors.js";

/** Numeric weight per feedback kind. */
const KIND_WEIGHT: Record<FeedbackKind, number> = {
  click: 0.3,
  accept: 1.0,
  reject: -1.0,
  ignore: -0.1,
};

/** Port for persisting and querying feedback records. */
export interface FeedbackStore {
  save(feedback: Feedback): Promise<void>;
  findByUser(userId: string): Promise<readonly Feedback[]>;
  findByItem(itemId: string): Promise<readonly Feedback[]>;
}

/** In-memory implementation — swap for a real persistence adapter in production. */
export class InMemoryFeedbackStore implements FeedbackStore {
  private readonly records: Feedback[] = [];

  async save(feedback: Feedback): Promise<void> {
    this.records.push(feedback);
  }

  async findByUser(userId: string): Promise<readonly Feedback[]> {
    return this.records.filter((f) => f.userId === userId);
  }

  async findByItem(itemId: string): Promise<readonly Feedback[]> {
    return this.records.filter((f) => f.itemId === itemId);
  }
}

export interface FeedbackAdjustment {
  readonly itemId: string;
  /** Signed adjustment in [-1, 1] derived from all recorded feedback signals. */
  readonly adjustment: number;
  /** Number of signals that contributed. */
  readonly signalCount: number;
}

const RecordFeedbackInput = z.object({
  userId: z.string().min(1),
  itemId: z.string().min(1),
  kind: FeedbackSchema.shape.kind,
  score: z.number().min(0).max(1).optional(),
  recordedAt: z.string().datetime(),
});

type RecordFeedbackInput = z.infer<typeof RecordFeedbackInput>;

/** Service that records feedback and computes per-item score adjustments. */
export class FeedbackService {
  constructor(private readonly store: FeedbackStore) {}

  /** Validate and persist a single feedback signal. */
  async record(
    input: RecordFeedbackInput,
  ): Promise<Result<Feedback, FeedbackError>> {
    const parsed = RecordFeedbackInput.safeParse(input);
    if (!parsed.success) {
      return err(
        new FeedbackError(
          `invalid feedback: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
        ),
      );
    }

    const feedback = FeedbackSchema.parse(parsed.data);
    await this.store.save(feedback);
    return ok(feedback);
  }

  /**
   * Compute a signed score adjustment for each item a user has interacted with.
   * Adjustments are averaged across signals and clamped to [-1, 1].
   */
  async adjustmentsForUser(
    userId: string,
  ): Promise<Result<readonly FeedbackAdjustment[], FeedbackError>> {
    const feedbacks = await this.store.findByUser(userId);

    const grouped = new Map<string, number[]>();
    for (const f of feedbacks) {
      const weight = KIND_WEIGHT[f.kind];
      const scaled = f.score !== undefined ? weight * f.score : weight;
      const existing = grouped.get(f.itemId) ?? [];
      grouped.set(f.itemId, [...existing, scaled]);
    }

    const adjustments: FeedbackAdjustment[] = [...grouped.entries()].map(
      ([itemId, signals]) => {
        const sum = signals.reduce((acc, s) => acc + s, 0);
        const raw = signals.length > 0 ? sum / signals.length : 0;
        return {
          itemId,
          adjustment: Math.max(-1, Math.min(1, raw)),
          signalCount: signals.length,
        };
      },
    );

    return ok(adjustments);
  }

  /**
   * Compute aggregate popularity score for an item across all users.
   * Returns a value in [0, 1] derived from weighted positive signal ratio.
   */
  async popularityScore(
    itemId: string,
  ): Promise<Result<number, FeedbackError>> {
    const feedbacks = await this.store.findByItem(itemId);
    if (feedbacks.length === 0) return ok(0);

    const total = feedbacks.reduce((acc, f) => {
      const weight = KIND_WEIGHT[f.kind];
      return acc + (weight > 0 ? weight : 0);
    }, 0);

    const maxPossible = feedbacks.length * KIND_WEIGHT["accept"];
    const score = maxPossible > 0 ? Math.min(1, total / maxPossible) : 0;
    return ok(score);
  }
}
