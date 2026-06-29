// ResourceDescriptor: typed reference to any domain resource for policy matching.

/** Known resource types in the Veritas platform. */
export type ResourceType =
  | "report"
  | "order"
  | "agent"
  | "billing"
  | "admin"
  | "claim"
  | "source"
  | "verification"
  | "user"
  | "organization"
  | "webhook"
  | "api-key"
  | "*";

/** A descriptor for the resource being accessed. */
export interface ResourceDescriptor {
  readonly type: ResourceType;
  /** Optional specific resource id — omit for collection-level checks. */
  readonly id?: string;
  /** Optional owning org id for cross-org isolation. */
  readonly orgId?: string;
  /** Optional extra attributes (e.g. tier, status) for attribute-based checks. */
  readonly attributes: Readonly<Record<string, unknown>>;
}

/** Construct a ResourceDescriptor. */
export function makeResource(
  type: ResourceType,
  id?: string,
  orgId?: string,
  attributes: Readonly<Record<string, unknown>> = {},
): ResourceDescriptor {
  return Object.freeze({ type, id, orgId, attributes });
}

/** Wildcard resource that matches any resource type. */
export const WILDCARD_RESOURCE: ResourceDescriptor = Object.freeze({
  type: "*" as ResourceType,
  attributes: {},
});

/** Check if a descriptor matches a given type (or is wildcard). */
export function resourceMatchesType(
  resource: ResourceDescriptor,
  type: ResourceType,
): boolean {
  return resource.type === "*" || resource.type === type;
}
