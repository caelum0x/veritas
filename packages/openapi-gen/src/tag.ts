// OpenAPI tag builder for grouping and describing API operation categories.
import type { TagObject, ExternalDocsObject } from "./types.js";

export type { TagObject, ExternalDocsObject };

export function buildTag(
  name: string,
  description?: string,
  externalDocs?: ExternalDocsObject,
): TagObject {
  return {
    name,
    ...(description !== undefined && { description }),
    ...(externalDocs !== undefined && { externalDocs }),
  };
}

export function externalDocs(url: string, description?: string): ExternalDocsObject {
  return {
    url,
    ...(description !== undefined && { description }),
  };
}

export function mergeTags(
  base: readonly TagObject[],
  additions: readonly TagObject[],
): readonly TagObject[] {
  const existing = new Set(base.map((t) => t.name));
  const fresh = additions.filter((t) => !existing.has(t.name));
  return [...base, ...fresh];
}

export function sortTags(tags: readonly TagObject[]): readonly TagObject[] {
  return [...tags].sort((a, b) => a.name.localeCompare(b.name));
}

// Standard Veritas API tags used across the platform
export const veritasTags = {
  claims: buildTag(
    "Claims",
    "Create, read, update, and delete fact claims submitted for verification",
  ),
  verification: buildTag(
    "Verification",
    "Submit claims for verification and retrieve verification results",
  ),
  sources: buildTag(
    "Sources",
    "Manage trusted sources and source provenance metadata",
  ),
  evidence: buildTag(
    "Evidence",
    "Attach and retrieve evidence items associated with claims",
  ),
  reports: buildTag(
    "Reports",
    "Generate and download structured verification reports",
  ),
  orders: buildTag(
    "Orders",
    "Manage verification orders and track their lifecycle",
  ),
  agents: buildTag(
    "Agents",
    "Register and manage verifier agents that process claims",
  ),
  organizations: buildTag(
    "Organizations",
    "Manage organizations and their member access",
  ),
  users: buildTag(
    "Users",
    "User profile management and authentication",
  ),
  billing: buildTag(
    "Billing",
    "Subscriptions, invoices, and payment management",
  ),
  webhooks: buildTag(
    "Webhooks",
    "Register and manage webhook endpoints for async event delivery",
  ),
  apiKeys: buildTag(
    "API Keys",
    "Create and revoke programmatic API keys for service integrations",
  ),
  audit: buildTag(
    "Audit",
    "Immutable audit log of platform actions for compliance",
  ),
  health: buildTag(
    "Health",
    "Platform health and readiness endpoints",
  ),
} as const;

export type VeritasTagName = keyof typeof veritasTags;

export function getTag(name: VeritasTagName): TagObject {
  return veritasTags[name];
}

export function allVeritasTags(): readonly TagObject[] {
  return Object.values(veritasTags);
}
