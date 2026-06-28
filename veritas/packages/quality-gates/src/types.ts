// Shared types and configuration for the quality-gates package.

import { z } from "zod";
import type { Severity } from "./severity.js";
import { SEVERITIES } from "./severity.js";

/** Zod schema for Severity, enabling safe parsing from external input. */
export const severitySchema = z.enum(SEVERITIES);

/** Options controlling pipeline-level gate behaviour. */
export interface PipelineOptions {
  /** Minimum severity that causes the overall pipeline to be marked as failed. */
  readonly failOn: Severity;
  /** When true, stop evaluating remaining gates after the first failure. */
  readonly stopOnFirstFailure: boolean;
  /** ISO-8601 timestamp used as "now" across all freshness-sensitive gates. */
  readonly asOf: string;
  /** Maximum milliseconds allowed for a single gate evaluation before rejection. */
  readonly gateTimeoutMs?: number;
}

/** Default pipeline options used when not explicitly configured. */
export const DEFAULT_PIPELINE_OPTIONS: PipelineOptions = {
  failOn: "error",
  stopOnFirstFailure: false,
  asOf: new Date().toISOString(),
  gateTimeoutMs: 5_000,
} as const;

/** Zod schema for PipelineOptions, for validation at API boundaries. */
export const pipelineOptionsSchema = z
  .object({
    failOn: severitySchema.default("error"),
    stopOnFirstFailure: z.boolean().default(false),
    asOf: z.string().datetime(),
    gateTimeoutMs: z.number().int().positive().optional(),
  })
  .readonly();

export type PipelineOptionsInput = z.input<typeof pipelineOptionsSchema>;

/** Metadata attached to a registered gate for tooling and documentation. */
export interface GateMeta {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaultFailOn: Severity;
}
