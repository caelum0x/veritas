// Eval case: a single labelled verification input with expected outputs.
import { z } from "zod";

/** Zod schema for a labelled expected claim verdict. */
const expectedClaimVerdictSchema = z.object({
  claimText: z.string().min(1),
  verdict: z.enum(["SUPPORTED", "REFUTED", "UNVERIFIABLE"]),
});

/** Zod schema for an eval case. */
export const evalCaseSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
  inputText: z.string().min(1),
  expectedVerdicts: z.array(expectedClaimVerdictSchema).min(1),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});

/** A single eval case with labelled ground-truth verdicts. */
export type EvalCase = z.infer<typeof evalCaseSchema>;

/** Build an EvalCase value, throwing on validation failure. */
export function makeEvalCase(raw: unknown): EvalCase {
  return evalCaseSchema.parse(raw);
}

/** Return all unique tags in a set of cases. */
export function collectTags(cases: readonly EvalCase[]): readonly string[] {
  const tags = new Set<string>();
  for (const c of cases) {
    for (const t of c.tags) tags.add(t);
  }
  return Array.from(tags).sort();
}

/** Filter cases by tag. */
export function filterByTag(
  cases: readonly EvalCase[],
  tag: string
): readonly EvalCase[] {
  return cases.filter((c) => c.tags.includes(tag));
}
