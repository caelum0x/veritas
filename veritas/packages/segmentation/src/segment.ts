// Core Segment entity — immutable value object with rule group and metadata.
import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { SegmentId, SegmentIdSchema, SegmentKind } from "./types.js";
import { RuleGroup, RuleGroupSchema } from "./rule.js";
import { InvalidRuleError, SegmentConflictError } from "./errors.js";

export interface Segment {
  readonly id: SegmentId;
  readonly name: string;
  readonly description: string;
  readonly kind: SegmentKind;
  readonly ruleGroup: RuleGroup;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const SegmentSchema = z.object({
  id: SegmentIdSchema,
  name: z.string().min(1).max(128),
  description: z.string().max(512).default(""),
  kind: z.enum(["static", "dynamic"]),
  ruleGroup: RuleGroupSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateSegmentSchema = z.object({
  id: SegmentIdSchema,
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  kind: z.enum(["static", "dynamic"]).default("dynamic"),
  ruleGroup: RuleGroupSchema,
});

export type CreateSegmentInput = z.infer<typeof CreateSegmentSchema>;

/** Construct a new Segment from raw input, stamping timestamps. */
export function createSegment(
  raw: unknown,
  now: string,
  existingNames: ReadonlySet<string>
): Result<Segment, InvalidRuleError | SegmentConflictError> {
  const parsed = CreateSegmentSchema.safeParse(raw);
  if (!parsed.success) {
    return err(new InvalidRuleError(parsed.error.issues[0]?.message ?? "invalid segment"));
  }
  const input = parsed.data;
  if (existingNames.has(input.name)) {
    return err(new SegmentConflictError(input.name));
  }
  const segment: Segment = Object.freeze({
    id: input.id,
    name: input.name,
    description: input.description ?? "",
    kind: input.kind,
    ruleGroup: input.ruleGroup,
    createdAt: now,
    updatedAt: now,
  });
  return ok(segment);
}

/** Return an updated Segment with patched fields (immutable). */
export function updateSegment(
  base: Segment,
  patch: Partial<Pick<Segment, "name" | "description" | "ruleGroup">>,
  now: string
): Result<Segment, InvalidRuleError> {
  if (patch.ruleGroup !== undefined) {
    const check = RuleGroupSchema.safeParse(patch.ruleGroup);
    if (!check.success) {
      return err(new InvalidRuleError(check.error.issues[0]?.message ?? "invalid rule group"));
    }
  }
  return ok(Object.freeze({ ...base, ...patch, updatedAt: now }));
}
