// Simulates network latency profiles (fixed, uniform, normal, p99-spike) for mock responses.
import { z } from "zod";

export const LatencyProfileSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("fixed"), ms: z.number().int().min(0) }),
  z.object({
    kind: z.literal("uniform"),
    minMs: z.number().int().min(0),
    maxMs: z.number().int().min(0),
  }),
  z.object({
    kind: z.literal("normal"),
    meanMs: z.number().min(0),
    stddevMs: z.number().min(0),
  }),
  z.object({
    kind: z.literal("spike"),
    baseMs: z.number().int().min(0),
    spikeMs: z.number().int().min(0),
    spikePercentage: z.number().min(0).max(100),
  }),
]);
export type LatencyProfile = z.infer<typeof LatencyProfileSchema>;

function gaussianSample(mean: number, stddev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1 + Number.EPSILON)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, mean + z0 * stddev);
}

export function sampleLatencyMs(profile: LatencyProfile): number {
  switch (profile.kind) {
    case "none":
      return 0;
    case "fixed":
      return profile.ms;
    case "uniform": {
      const range = profile.maxMs - profile.minMs;
      return Math.floor(profile.minMs + Math.random() * range);
    }
    case "normal":
      return Math.floor(gaussianSample(profile.meanMs, profile.stddevMs));
    case "spike": {
      const roll = Math.random() * 100;
      return roll < profile.spikePercentage ? profile.spikeMs : profile.baseMs;
    }
  }
}

export async function applyLatency(profile: LatencyProfile): Promise<void> {
  const ms = sampleLatencyMs(profile);
  if (ms <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export const LATENCY_PRESETS = {
  none: { kind: "none" } satisfies LatencyProfile,
  fast: { kind: "uniform", minMs: 5, maxMs: 30 } satisfies LatencyProfile,
  typical: { kind: "normal", meanMs: 120, stddevMs: 40 } satisfies LatencyProfile,
  slow: { kind: "normal", meanMs: 800, stddevMs: 200 } satisfies LatencyProfile,
  flaky: { kind: "spike", baseMs: 80, spikeMs: 3000, spikePercentage: 10 } satisfies LatencyProfile,
} as const;
