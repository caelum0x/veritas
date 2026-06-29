// On-call schedule management: rotations, overrides, and current on-call lookup.
import { z } from "zod";
import { newId, IsoTimestamp, Result, ok, err, map } from "@veritas/core";

export const RotationTypeSchema = z.enum(["DAILY", "WEEKLY", "CUSTOM"]);
export type RotationType = z.infer<typeof RotationTypeSchema>;

export const OnCallShiftSchema = z.object({
  id: z.string(),
  userId: z.string(),
  teamId: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  isOverride: z.boolean().default(false),
  overrideReason: z.string().optional(),
});
export type OnCallShift = z.infer<typeof OnCallShiftSchema>;

export const OnCallRotationSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(128),
  teamId: z.string(),
  type: RotationTypeSchema,
  shiftDurationHours: z.number().int().min(1).max(168),
  memberIds: z.array(z.string()).min(1),
  startAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OnCallRotation = z.infer<typeof OnCallRotationSchema>;

export interface OnCallSchedule {
  readonly rotations: readonly OnCallRotation[];
  readonly overrides: readonly OnCallShift[];
}

export function makeRotation(
  input: Omit<OnCallRotation, "id" | "createdAt" | "updatedAt">,
  now: IsoTimestamp
): OnCallRotation {
  return OnCallRotationSchema.parse({
    ...input,
    id: newId("oncall"),
    createdAt: now,
    updatedAt: now,
  });
}

export function makeOverrideShift(
  input: Omit<OnCallShift, "id" | "isOverride">,
  now: IsoTimestamp
): OnCallShift {
  void now;
  return OnCallShiftSchema.parse({
    ...input,
    id: newId("oncall"),
    isOverride: true,
  });
}

export function computeCurrentShift(
  rotation: OnCallRotation,
  now: IsoTimestamp
): Result<{ userId: string; shiftStart: IsoTimestamp; shiftEnd: IsoTimestamp }, string> {
  const startMs = new Date(rotation.startAt).getTime();
  const nowMs = new Date(now).getTime();

  if (nowMs < startMs) {
    return err("Rotation has not started yet");
  }

  const shiftMs = rotation.shiftDurationHours * 60 * 60 * 1000;
  const elapsed = nowMs - startMs;
  const shiftIndex = Math.floor(elapsed / shiftMs) % rotation.memberIds.length;
  const userId = rotation.memberIds[shiftIndex];

  if (!userId) {
    return err("No member found for current shift");
  }

  const shiftStartMs = startMs + Math.floor(elapsed / shiftMs) * shiftMs;
  const shiftEndMs = shiftStartMs + shiftMs;

  return ok({
    userId,
    shiftStart: new Date(shiftStartMs).toISOString() as IsoTimestamp,
    shiftEnd: new Date(shiftEndMs).toISOString() as IsoTimestamp,
  });
}

export function resolveOnCallUser(
  schedule: OnCallSchedule,
  teamId: string,
  now: IsoTimestamp
): Result<string, string> {
  const nowMs = new Date(now).getTime();

  // Check overrides first
  const activeOverride = schedule.overrides.find(
    (o) =>
      o.teamId === teamId &&
      new Date(o.startAt).getTime() <= nowMs &&
      new Date(o.endAt).getTime() > nowMs
  );
  if (activeOverride) {
    return ok(activeOverride.userId);
  }

  // Fall back to rotation
  const rotation = schedule.rotations.find((r) => r.teamId === teamId);
  if (!rotation) {
    return err(`No on-call rotation found for team "${teamId}"`);
  }

  return map(computeCurrentShift(rotation, now), (s) => s.userId);
}

export function resolveOnCallUserId(
  schedule: OnCallSchedule,
  teamId: string,
  now: IsoTimestamp
): Result<string, string> {
  const nowMs = new Date(now).getTime();

  const activeOverride = schedule.overrides.find(
    (o) =>
      o.teamId === teamId &&
      new Date(o.startAt).getTime() <= nowMs &&
      new Date(o.endAt).getTime() > nowMs
  );
  if (activeOverride) return ok(activeOverride.userId);

  const rotation = schedule.rotations.find((r) => r.teamId === teamId);
  if (!rotation) return err(`No on-call rotation found for team "${teamId}"`);

  const result = computeCurrentShift(rotation, now);
  if (result.ok) return ok(result.value.userId);
  return err(result.error as string);
}
