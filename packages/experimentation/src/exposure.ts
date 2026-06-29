// Log and retrieve experiment exposures — records when a unit sees a variant
import { z } from "zod";
import { newId } from "@veritas/core";
import type { Exposure } from "./types.js";

export const LogExposureInputSchema = z.object({
  experimentId: z.string().min(1),
  unitId: z.string().min(1),
  variantId: z.string().min(1),
  variantKey: z.string().min(1),
  attributes: z.record(z.unknown()).optional(),
});

export type LogExposureInput = z.infer<typeof LogExposureInputSchema>;

/** Port interface for exposure persistence */
export interface ExposureLogger {
  log(exposure: Exposure): Promise<void>;
  listByExperiment(experimentId: string): Promise<readonly Exposure[]>;
  listByUnit(unitId: string): Promise<readonly Exposure[]>;
  countByVariant(experimentId: string, variantId: string): Promise<number>;
}

/** Build an Exposure record from log input */
export function makeExposure(input: LogExposureInput): Exposure {
  return {
    id: newId("Exposure"),
    experimentId: input.experimentId,
    unitId: input.unitId,
    variantId: input.variantId,
    variantKey: input.variantKey,
    exposedAt: new Date().toISOString(),
    attributes: input.attributes ?? {},
  };
}

/** In-memory implementation of ExposureLogger */
export class InMemoryExposureLogger implements ExposureLogger {
  private readonly store: Exposure[] = [];

  async log(exposure: Exposure): Promise<void> {
    this.store.push(exposure);
  }

  async listByExperiment(experimentId: string): Promise<readonly Exposure[]> {
    return this.store.filter((e) => e.experimentId === experimentId);
  }

  async listByUnit(unitId: string): Promise<readonly Exposure[]> {
    return this.store.filter((e) => e.unitId === unitId);
  }

  async countByVariant(experimentId: string, variantId: string): Promise<number> {
    return this.store.filter(
      (e) => e.experimentId === experimentId && e.variantId === variantId
    ).length;
  }

  /** Total logged exposures */
  get size(): number {
    return this.store.length;
  }

  /** Remove all stored exposures (useful in tests) */
  clear(): void {
    this.store.length = 0;
  }
}

/** Convenience: log an exposure and return the created record */
export async function logExposure(
  logger: ExposureLogger,
  input: LogExposureInput
): Promise<Exposure> {
  const exposure = makeExposure(input);
  await logger.log(exposure);
  return exposure;
}

/** Deduplicate exposures keeping first occurrence per (experimentId, unitId) */
export function deduplicateExposures(
  exposures: readonly Exposure[]
): readonly Exposure[] {
  const seen = new Set<string>();
  return exposures.filter((e) => {
    const key = `${e.experimentId}:${e.unitId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
