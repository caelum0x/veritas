// Shared types for the segmentation module.
import { z } from "zod";

export const SegmentIdSchema = z.string().brand<"SegmentId">();
export type SegmentId = z.infer<typeof SegmentIdSchema>;

export const TraitKeySchema = z.string().min(1);
export type TraitKey = z.infer<typeof TraitKeySchema>;

export type TraitValue = string | number | boolean | null;

export const TraitMapSchema = z.record(
  TraitKeySchema,
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);
export type TraitMap = z.infer<typeof TraitMapSchema>;

export type SegmentKind = "static" | "dynamic";

export interface SegmentMembership {
  readonly segmentId: SegmentId;
  readonly userId: string;
  readonly addedAt: string;
}

export interface QueryFilter {
  readonly kind?: SegmentKind;
  readonly tag?: string;
}

export interface SegmentStats {
  readonly segmentId: SegmentId;
  readonly memberCount: number;
  readonly lastEvaluatedAt: string | null;
}
