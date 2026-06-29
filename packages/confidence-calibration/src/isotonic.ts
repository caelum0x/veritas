// Isotonic regression calibrator using pool-adjacent-violators (PAV) algorithm
import { ok, err, type Result } from "@veritas/core";
import type {
  Calibrator,
  CalibrationSample,
  CalibrationParams,
  RawScore,
  CalibratedScore,
} from "./calibrator.js";

const MIN_SAMPLES = 2;

interface IsotonicSegment {
  readonly meanScore: number;
  readonly meanLabel: number;
}

function pavAlgorithm(sorted: readonly CalibrationSample[]): IsotonicSegment[] {
  // Each point starts as its own block
  const blocks: Array<{ scores: number[]; labels: number[] }> = sorted.map(
    (s) => ({ scores: [s.score], labels: [s.label] }),
  );

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < blocks.length - 1; i++) {
      const cur = blocks[i]!;
      const nxt = blocks[i + 1]!;
      const curMean = cur.labels.reduce((a, b) => a + b, 0) / cur.labels.length;
      const nxtMean = nxt.labels.reduce((a, b) => a + b, 0) / nxt.labels.length;

      if (curMean > nxtMean) {
        // Merge
        blocks.splice(i, 2, {
          scores: [...cur.scores, ...nxt.scores],
          labels: [...cur.labels, ...nxt.labels],
        });
        changed = true;
        break;
      }
    }
  }

  return blocks.map((b) => ({
    meanScore: b.scores.reduce((a, v) => a + v, 0) / b.scores.length,
    meanLabel: b.labels.reduce((a, v) => a + v, 0) / b.labels.length,
  }));
}

function interpolate(score: RawScore, segments: readonly IsotonicSegment[]): CalibratedScore {
  if (segments.length === 0) return score;
  if (score <= segments[0]!.meanScore) return segments[0]!.meanLabel;
  if (score >= segments[segments.length - 1]!.meanScore) {
    return segments[segments.length - 1]!.meanLabel;
  }

  for (let i = 0; i < segments.length - 1; i++) {
    const lo = segments[i]!;
    const hi = segments[i + 1]!;
    if (score >= lo.meanScore && score <= hi.meanScore) {
      const t = (score - lo.meanScore) / (hi.meanScore - lo.meanScore);
      return lo.meanLabel + t * (hi.meanLabel - lo.meanLabel);
    }
  }

  return score;
}

/** Isotonic regression calibrator using pool-adjacent-violators algorithm. */
export class IsotonicCalibrator implements Calibrator {
  readonly name = "isotonic";
  private segments: readonly IsotonicSegment[] | null = null;

  fit(samples: readonly CalibrationSample[]): Result<CalibrationParams> {
    if (samples.length < MIN_SAMPLES) {
      return err(new Error(`Isotonic regression requires at least ${MIN_SAMPLES} samples`));
    }

    const sorted = [...samples].sort((a, b) => a.score - b.score);
    const segs = pavAlgorithm(sorted);
    this.segments = segs;
    return ok({ segments: segs });
  }

  predict(score: RawScore): Result<CalibratedScore> {
    if (this.segments === null) {
      return err(new Error("IsotonicCalibrator not fitted; call fit() or loadParams() first"));
    }
    return ok(interpolate(score, this.segments));
  }

  loadParams(params: CalibrationParams): Result<void> {
    const segs = params["segments"];
    if (!Array.isArray(segs)) {
      return err(new Error("Invalid isotonic params: expected segments array"));
    }
    const validated: IsotonicSegment[] = [];
    for (const s of segs) {
      if (
        typeof s !== "object" ||
        s === null ||
        typeof (s as Record<string, unknown>)["meanScore"] !== "number" ||
        typeof (s as Record<string, unknown>)["meanLabel"] !== "number"
      ) {
        return err(new Error("Invalid segment shape in isotonic params"));
      }
      validated.push({
        meanScore: (s as Record<string, unknown>)["meanScore"] as number,
        meanLabel: (s as Record<string, unknown>)["meanLabel"] as number,
      });
    }
    this.segments = validated;
    return ok(undefined);
  }

  exportParams(): Result<CalibrationParams> {
    if (this.segments === null) {
      return err(new Error("No params to export; fit first"));
    }
    return ok({ segments: this.segments });
  }
}
