// Eval dataset: a named, versioned collection of EvalCases.
import { z } from "zod";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { evalCaseSchema, makeEvalCase } from "./case.js";
import type { EvalCase } from "./case.js";
import { DatasetError } from "./errors.js";

/** Zod schema for a full eval dataset. */
export const evalDatasetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().default("1.0.0"),
  description: z.string().optional(),
  cases: z.array(evalCaseSchema).min(1),
  createdAt: z.string().datetime().optional(),
});

/** A versioned set of labelled eval cases. */
export type EvalDataset = z.infer<typeof evalDatasetSchema>;

/** Parse and validate a raw object into an EvalDataset. */
export function parseDataset(raw: unknown): Result<EvalDataset, DatasetError> {
  const result = evalDatasetSchema.safeParse(raw);
  if (!result.success) {
    return err(
      new DatasetError(`Invalid dataset: ${result.error.message}`, {
        cause: result.error,
      })
    );
  }
  return ok(result.data);
}

/** Build an EvalDataset from a list of raw case objects. */
export function buildDataset(
  id: string,
  name: string,
  rawCases: readonly unknown[]
): Result<EvalDataset, DatasetError> {
  const cases: EvalCase[] = [];
  for (const raw of rawCases) {
    try {
      cases.push(makeEvalCase(raw));
    } catch (e) {
      return err(new DatasetError(`Failed to parse case: ${String(e)}`, { cause: e }));
    }
  }
  if (cases.length === 0) {
    return err(new DatasetError("Dataset must contain at least one case"));
  }
  return ok({ id, name, version: "1.0.0", cases, createdAt: new Date().toISOString() });
}

/** Merge two datasets into one, preserving unique cases by id. */
export function mergeDatasets(
  base: EvalDataset,
  override: EvalDataset
): EvalDataset {
  const byId = new Map<string, EvalCase>(base.cases.map((c) => [c.id, c]));
  for (const c of override.cases) byId.set(c.id, c);
  return {
    ...base,
    cases: Array.from(byId.values()),
  };
}

/** Slice a dataset to at most `limit` cases (deterministic). */
export function sliceDataset(dataset: EvalDataset, limit: number): EvalDataset {
  return { ...dataset, cases: dataset.cases.slice(0, limit) };
}
