// Source record: create and retrieve structured source objects with tier assignment.

import { type Result, ok, err, newId, type IsoTimestamp, asIsoTimestamp, contentHash, NotFoundError, ValidationError } from "@veritas/core";
import { type Source, type CreateSource, CreateSourceSchema, SourceSchema } from "@veritas/contracts";
import { SourceTier } from "@veritas/core";
/** Build a new Source record from CreateSource input, assigning default tier and metadata. */
export function buildSource(input: CreateSource): Result<Source> {
  const parsed = CreateSourceSchema.safeParse(input);
  if (!parsed.success) {
    return err(new ValidationError({ message: "Invalid source input", details: { fields: parsed.error.issues.map(i => ({ path: i.path.join("."), message: i.message })) } }));
  }
  const data = parsed.data;
  const domain = extractDomain(data.url);
  const now = asIsoTimestamp(new Date().toISOString());
  const hash = data.excerpt != null ? contentHash(Buffer.from(data.excerpt)) : null;

  const source: Source = {
    id: newId("source"),
    url: data.url,
    domain,
    title: data.title ?? null,
    publisher: data.publisher ?? null,
    tier: data.tier ?? inferTier(domain),
    publishedAt: data.publishedAt ?? null,
    retrievedAt: now,
    contentHash: hash,
    excerpt: data.excerpt ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const validated = SourceSchema.safeParse(source);
  if (!validated.success) {
    return err(new ValidationError({ message: "Source record failed schema validation" }));
  }
  return ok(validated.data);
}

/** Extract the domain from a URL string, returning empty string on failure. */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Infer a SourceTier from the domain string (simple heuristic). */
function inferTier(domain: string): typeof SourceTier[keyof typeof SourceTier] {
  if (domain === "") return SourceTier.UNKNOWN;
  const tld = domain.split(".").pop() ?? "";
  if (["gov", "edu", "int"].includes(tld)) return SourceTier.PRIMARY;
  if (["org", "ac"].includes(tld)) return SourceTier.SECONDARY;
  return SourceTier.TERTIARY;
}
