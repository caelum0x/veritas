// Calculates available headroom (spare capacity) for each resource.
import { Result, ok, err } from "@veritas/core";
import { Resource } from "./capacity-model.js";
import { UtilizationPoint } from "./types.js";
import { InsufficientDataError } from "./errors.js";

export interface HeadroomResult {
  readonly resourceName: string;
  readonly capacity: number;
  readonly usedAbsolute: number;
  readonly headroomAbsolute: number;
  readonly headroomRatio: number;
  readonly unit: string;
}

/**
 * Compute headroom for each resource using the latest utilization point per resource.
 * Returns an error if any declared resource has no utilization data.
 */
export function computeHeadroom(
  resources: Resource[],
  points: UtilizationPoint[]
): Result<HeadroomResult[], InsufficientDataError> {
  if (points.length === 0) {
    return err(new InsufficientDataError("No utilization points provided for headroom calculation"));
  }

  // Keep only the most recent sample per resource
  const latest = new Map<string, UtilizationPoint>();
  for (const p of points) {
    const existing = latest.get(p.resourceName);
    if (!existing || p.timestampIso > existing.timestampIso) {
      latest.set(p.resourceName, p);
    }
  }

  const results: HeadroomResult[] = [];
  const missing: string[] = [];

  for (const resource of resources) {
    const point = latest.get(resource.name);
    if (!point) {
      missing.push(resource.name);
      continue;
    }
    const usedAbsolute = point.ratio * resource.capacity;
    const headroomAbsolute = resource.capacity - usedAbsolute;
    const headroomRatio = headroomAbsolute / resource.capacity;
    results.push({
      resourceName: resource.name,
      capacity: resource.capacity,
      usedAbsolute,
      headroomAbsolute,
      headroomRatio,
      unit: resource.unit,
    });
  }

  if (missing.length > 0) {
    return err(
      new InsufficientDataError(
        `Missing utilization data for resources: ${missing.join(", ")}`
      )
    );
  }

  return ok(results);
}

/** Identify resources whose headroom ratio is below the given minimum ratio. */
export function filterLowHeadroom(
  headrooms: HeadroomResult[],
  minRatio: number
): HeadroomResult[] {
  return headrooms.filter((h) => h.headroomRatio < minRatio);
}
