// Capacity limits enforcement: clamp desired capacity within [min, max]
import { z } from "zod";
import { Result, ok, err } from "@veritas/core";
import { LimitsViolationError } from "./errors.js";

export const CapacityLimitsSchema = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().positive(),
}).refine((v) => v.min <= v.max, { message: "min must be <= max" });

export type CapacityLimits = z.infer<typeof CapacityLimitsSchema>;

export function makeCapacityLimits(min: number, max: number): CapacityLimits {
  return CapacityLimitsSchema.parse({ min, max });
}

/** Clamp desired capacity within limits; returns err if already at boundary and direction is blocked */
export function clampCapacity(
  desired: number,
  limits: CapacityLimits
): Result<number, LimitsViolationError> {
  if (desired < 0) {
    return err(new LimitsViolationError(desired, limits.min, limits.max));
  }
  const clamped = Math.min(Math.max(desired, limits.min), limits.max);
  return ok(clamped);
}

/** Assert desired is strictly within limits; returns err if violated */
export function assertWithinLimits(
  desired: number,
  limits: CapacityLimits
): Result<number, LimitsViolationError> {
  if (desired < limits.min || desired > limits.max) {
    return err(new LimitsViolationError(desired, limits.min, limits.max));
  }
  return ok(desired);
}

export function isAtMin(current: number, limits: CapacityLimits): boolean {
  return current <= limits.min;
}

export function isAtMax(current: number, limits: CapacityLimits): boolean {
  return current >= limits.max;
}
