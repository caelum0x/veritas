// Maps raw IdP attribute bags to a normalised SsoPrincipal.

import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { AttributeMappingError } from "./errors.js";
import type { IdpAttributes, SsoPrincipal } from "./types.js";

/** Per-provider field mapping configuration. */
export interface AttributeMap {
  /** Attribute key that holds the unique external user ID. */
  readonly externalId: string;
  /** Attribute key for the user's email address. */
  readonly email: string;
  /** Attribute key for the user's display / full name. */
  readonly displayName: string;
  /** Optional attribute key for given (first) name. */
  readonly givenName?: string;
  /** Optional attribute key for family (last) name. */
  readonly familyName?: string;
  /** Optional attribute key that holds group memberships. */
  readonly groups?: string;
}

export const AttributeMapSchema = z.object({
  externalId: z.string().min(1),
  email: z.string().min(1),
  displayName: z.string().min(1),
  givenName: z.string().min(1).optional(),
  familyName: z.string().min(1).optional(),
  groups: z.string().min(1).optional(),
});

/** Default attribute map matching common SAML/OIDC claim names. */
export const DEFAULT_ATTRIBUTE_MAP: AttributeMap = {
  externalId: "sub",
  email: "email",
  displayName: "name",
  givenName: "given_name",
  familyName: "family_name",
  groups: "groups",
};

function getString(attrs: IdpAttributes, key: string): string | undefined {
  const val = attrs[key];
  if (val === undefined) return undefined;
  return Array.isArray(val) ? val[0] : val;
}

function getStringArray(attrs: IdpAttributes, key: string): readonly string[] {
  const val = attrs[key];
  if (val === undefined) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Applies the given attribute map to a raw IdP attribute bag and returns a
 * normalised SsoPrincipal, or an AttributeMappingError if required fields are absent.
 */
export function mapAttributes(
  attrs: IdpAttributes,
  map: AttributeMap = DEFAULT_ATTRIBUTE_MAP
): Result<SsoPrincipal, AttributeMappingError> {
  const externalId = getString(attrs, map.externalId);
  if (!externalId) return err(new AttributeMappingError(map.externalId));

  const email = getString(attrs, map.email);
  if (!email) return err(new AttributeMappingError(map.email));

  const displayName = getString(attrs, map.displayName) ?? email;
  const givenName = map.givenName ? getString(attrs, map.givenName) : undefined;
  const familyName = map.familyName ? getString(attrs, map.familyName) : undefined;
  const groups = map.groups ? getStringArray(attrs, map.groups) : [];

  return ok({
    externalId,
    email,
    displayName,
    givenName,
    familyName,
    groups,
    rawAttributes: attrs,
  });
}

/** Merges a partial override map on top of the default attribute map. */
export function mergeAttributeMap(
  override: Partial<AttributeMap>
): AttributeMap {
  return { ...DEFAULT_ATTRIBUTE_MAP, ...override };
}
