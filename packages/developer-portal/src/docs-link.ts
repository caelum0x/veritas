// Developer portal docs references — structured links to API docs, guides, and changelogs
import { z } from "zod";
import { urlSchema } from "@veritas/contracts";

export const DocsCategorySchema = z.enum([
  "getting-started",
  "authentication",
  "api-reference",
  "guides",
  "sdks",
  "webhooks",
  "changelog",
  "support",
]);
export type DocsCategory = z.infer<typeof DocsCategorySchema>;

export const DocsLinkSchema = z.object({
  id: z.string(),
  category: DocsCategorySchema,
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  url: urlSchema,
  slug: z.string().regex(/^[a-z0-9-/]+$/),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  publishedAt: z.string().optional(),
});
export type DocsLink = z.infer<typeof DocsLinkSchema>;

export const DocsLinkGroupSchema = z.object({
  category: DocsCategorySchema,
  label: z.string(),
  links: z.array(DocsLinkSchema),
});
export type DocsLinkGroup = z.infer<typeof DocsLinkGroupSchema>;

const CATEGORY_LABELS: Record<DocsCategory, string> = {
  "getting-started": "Getting Started",
  authentication: "Authentication",
  "api-reference": "API Reference",
  guides: "Guides",
  sdks: "SDKs & Libraries",
  webhooks: "Webhooks",
  changelog: "Changelog",
  support: "Support",
};

export function groupDocsByCategory(links: readonly DocsLink[]): DocsLinkGroup[] {
  const byCategory = new Map<DocsCategory, DocsLink[]>();
  for (const link of links) {
    const existing = byCategory.get(link.category) ?? [];
    byCategory.set(link.category, [...existing, link]);
  }
  return Array.from(byCategory.entries()).map(([category, categoryLinks]) => ({
    category,
    label: CATEGORY_LABELS[category],
    links: categoryLinks,
  }));
}

export function featuredDocsLinks(links: readonly DocsLink[]): DocsLink[] {
  return links.filter((l) => l.featured);
}

export function searchDocsLinks(links: readonly DocsLink[], query: string): DocsLink[] {
  const q = query.toLowerCase();
  return links.filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.tags.some((t) => t.toLowerCase().includes(q)),
  );
}

export function docsLinksByCategory(links: readonly DocsLink[], category: DocsCategory): DocsLink[] {
  return links.filter((l) => l.category === category);
}

export function categoryLabel(category: DocsCategory): string {
  return CATEGORY_LABELS[category];
}
