// Builds a hierarchical table of contents from OpenAPI documents and doc pages.

import type { OpenApiDocument } from "@veritas/openapi-gen";
import type { TableOfContents, TocEntry, DocPage } from "./types.js";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { TocBuildError } from "./errors.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildTagEntries(document: OpenApiDocument): readonly TocEntry[] {
  const tags = document.tags ?? [];
  const tagMap = new Map<string, TocEntry>();

  for (const tag of tags) {
    tagMap.set(tag.name, {
      id: `tag-${slugify(tag.name)}`,
      title: tag.name,
      slug: `/reference/${slugify(tag.name)}`,
      level: 2,
      children: [],
      tag: tag.name,
    });
  }

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (!pathItem) continue;
    const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"] as const;
    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const operationTags = operation.tags ?? ["default"];
      const title = operation.summary ?? operation.operationId ?? `${method.toUpperCase()} ${path}`;
      const id = operation.operationId ?? slugify(`${method}-${path}`);

      const operationEntry: TocEntry = {
        id,
        title,
        slug: `/reference/${slugify(operationTags[0] ?? "default")}#${id}`,
        level: 3,
        children: [],
        tag: operationTags[0],
      };

      const tagName = operationTags[0] ?? "default";
      const existing = tagMap.get(tagName);
      if (existing) {
        (tagMap as Map<string, TocEntry>).set(tagName, {
          ...existing,
          children: [...existing.children, operationEntry],
        });
      } else {
        tagMap.set(tagName, {
          id: `tag-${slugify(tagName)}`,
          title: tagName,
          slug: `/reference/${slugify(tagName)}`,
          level: 2,
          children: [operationEntry],
          tag: tagName,
        });
      }
    }
  }

  return Array.from(tagMap.values());
}

function buildPageEntries(pages: readonly DocPage[]): readonly TocEntry[] {
  return pages.map((page) => ({
    id: page.id,
    title: page.title,
    slug: `/${page.slug}`,
    level: 1,
    children: page.sections.map((section) => ({
      id: section.id,
      title: section.title,
      slug: `/${page.slug}#${section.id}`,
      level: section.level,
      children: [],
      tag: section.tag,
    })),
  }));
}

export function buildTableOfContents(
  document: OpenApiDocument,
  pages: readonly DocPage[] = [],
): Result<TableOfContents, TocBuildError> {
  try {
    const pageEntries = buildPageEntries(pages);
    const tagEntries = buildTagEntries(document);

    const referenceEntry: TocEntry = {
      id: "api-reference",
      title: "API Reference",
      slug: "/reference",
      level: 1,
      children: tagEntries,
    };

    const entries: readonly TocEntry[] = [...pageEntries, referenceEntry];

    return ok({ entries });
  } catch (e) {
    return err(
      new TocBuildError(e instanceof Error ? e.message : String(e)),
    );
  }
}

export function flattenToc(toc: TableOfContents): readonly TocEntry[] {
  const result: TocEntry[] = [];

  function flatten(entries: readonly TocEntry[]): void {
    for (const entry of entries) {
      result.push(entry);
      if (entry.children.length > 0) {
        flatten(entry.children);
      }
    }
  }

  flatten(toc.entries);
  return result;
}
