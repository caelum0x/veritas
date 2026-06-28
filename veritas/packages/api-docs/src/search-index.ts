// Builds a search index from OpenAPI document and doc pages for client-side search.

import type { OpenApiDocument } from "@veritas/openapi-gen";
import type { SearchIndex, SearchRecord, DocPage } from "./types.js";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { SearchIndexError } from "./errors.js";

const INDEX_VERSION = "1";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function operationRecords(document: OpenApiDocument): readonly SearchRecord[] {
  const records: SearchRecord[] = [];
  const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"] as const;

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (!pathItem) continue;
    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const operationId = operation.operationId ?? slugify(`${method}-${path}`);
      const tags = [...(operation.tags ?? [])];
      const title = operation.summary ?? `${method.toUpperCase()} ${path}`;

      const contentParts: string[] = [title];
      if (operation.description) contentParts.push(operation.description);
      contentParts.push(path);

      for (const [statusCode, response] of Object.entries(operation.responses)) {
        contentParts.push(`${statusCode}: ${response.description}`);
      }

      if (operation.parameters) {
        for (const param of operation.parameters) {
          const parts = [param.name, param.in];
          if (param.description) parts.push(param.description);
          contentParts.push(parts.join(" "));
        }
      }

      records.push({
        id: operationId,
        title,
        content: contentParts.join(" ").replace(/\s+/g, " ").trim(),
        slug: `/reference/${slugify(tags[0] ?? "default")}#${operationId}`,
        tags,
        type: "operation",
        operationId,
        method,
        path,
      });
    }
  }

  return records;
}

function schemaRecords(document: OpenApiDocument): readonly SearchRecord[] {
  const records: SearchRecord[] = [];
  const schemas = document.components?.schemas ?? {};

  for (const [name, schema] of Object.entries(schemas)) {
    const title = schema.title ?? name;
    const contentParts: string[] = [title];
    if (schema.description) contentParts.push(schema.description);

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        contentParts.push(propName);
        if (propSchema.description) contentParts.push(propSchema.description);
      }
    }

    records.push({
      id: `schema-${slugify(name)}`,
      title,
      content: contentParts.join(" ").replace(/\s+/g, " ").trim(),
      slug: `/reference/schemas#${slugify(name)}`,
      tags: [],
      type: "schema",
    });
  }

  return records;
}

function tagRecords(document: OpenApiDocument): readonly SearchRecord[] {
  return (document.tags ?? []).map((tag) => ({
    id: `tag-${slugify(tag.name)}`,
    title: tag.name,
    content: [tag.name, tag.description ?? ""].join(" ").trim(),
    slug: `/reference/${slugify(tag.name)}`,
    tags: [tag.name],
    type: "tag" as const,
  }));
}

function pageRecords(pages: readonly DocPage[]): readonly SearchRecord[] {
  const records: SearchRecord[] = [];

  for (const page of pages) {
    const contentParts = page.sections.map((s) => `${s.title} ${s.content}`);
    records.push({
      id: `page-${page.id}`,
      title: page.title,
      content: contentParts.join(" ").replace(/\s+/g, " ").trim(),
      slug: `/${page.slug}`,
      tags: [],
      type: "guide",
    });
  }

  return records;
}

export function buildSearchIndex(
  document: OpenApiDocument,
  pages: readonly DocPage[] = [],
): Result<SearchIndex, SearchIndexError> {
  try {
    const records: readonly SearchRecord[] = [
      ...tagRecords(document),
      ...operationRecords(document),
      ...schemaRecords(document),
      ...pageRecords(pages),
    ];

    const index: SearchIndex = {
      records,
      version: INDEX_VERSION,
      generatedAt: new Date().toISOString(),
    };

    return ok(index);
  } catch (e) {
    return err(
      new SearchIndexError(e instanceof Error ? e.message : String(e)),
    );
  }
}

export function searchRecords(
  index: SearchIndex,
  query: string,
): readonly SearchRecord[] {
  if (!query.trim()) return [];

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  return index.records.filter((record) => {
    const haystack = `${record.title} ${record.content} ${record.tags.join(" ")}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
