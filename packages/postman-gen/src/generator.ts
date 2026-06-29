// Generate a Postman collection from an OpenApiDocument descriptor.

import type { OpenApiDocument, HttpMethod } from "@veritas/openapi-gen";
import type { PostmanCollection, PostmanItem, PostmanVariable, GeneratorOptions } from "./types.js";
import { makeCollection } from "./collection.js";
import { buildRequest } from "./request.js";
import { makeFolder, groupIntoFolders } from "./folder.js";
import { defaultVariables } from "./variable.js";
import { buildCollectionAuth } from "./auth.js";

const HTTP_METHODS: readonly HttpMethod[] = [
  "get", "post", "put", "patch", "delete", "head", "options", "trace",
];

/** Derive the effective base URL from the document or options. */
function resolveBaseUrl(doc: OpenApiDocument, opts: GeneratorOptions): string {
  if (opts.baseUrl) return opts.baseUrl;
  const first = doc.servers?.[0];
  return first?.url ?? "{{baseUrl}}";
}

/** Map an operation to its first tag name (for folder grouping). */
function primaryTag(item: PostmanItem & { readonly _tags?: readonly string[] }): string {
  return item._tags?.[0] ?? "";
}

/** Convert all paths + operations in an OpenAPI document into PostmanItems. */
function buildItems(
  doc: OpenApiDocument,
  baseUrl: string,
): ReadonlyArray<PostmanItem & { readonly _tags?: readonly string[] }> {
  const items: Array<PostmanItem & { readonly _tags?: readonly string[] }> = [];

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, unknown>)[method];
      if (!operation || typeof operation !== "object") continue;

      // Merge path-level and operation-level parameters
      const pathParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
      const opObj = operation as typeof operation & { parameters?: unknown[] };
      const opParams = Array.isArray(opObj.parameters) ? opObj.parameters : [];
      const mergedParams = [...pathParams, ...opParams];
      const fullOp = ({ ...opObj, parameters: mergedParams } as unknown) as Parameters<typeof buildRequest>[2];

      const request = buildRequest(method as HttpMethod, path, fullOp, baseUrl);
      const tags = Array.isArray((operation as Record<string, unknown>)["tags"])
        ? ((operation as Record<string, unknown>)["tags"] as string[])
        : [];

      items.push({ ...request, request, _tags: tags });
    }
  }

  return items;
}

/**
 * Generate a complete Postman Collection v2.1 from an OpenAPI 3.x document.
 * The document is treated as a pure descriptor — no network calls are made.
 */
export function generateCollection(
  doc: OpenApiDocument,
  opts: GeneratorOptions = {},
): PostmanCollection {
  const baseUrl = resolveBaseUrl(doc, opts);
  const name = opts.collectionName ?? doc.info.title;
  const description = opts.description ?? doc.info.description;

  const rawItems = buildItems(doc, baseUrl);

  // Strip internal _tags before finalising items
  const postmanItems = rawItems.map(({ _tags: _ignored, ...rest }) => rest as PostmanItem);

  const groupByTag = opts.groupByTag ?? true;
  const organized = groupByTag
    ? groupIntoFolders(postmanItems, (item) => {
        const idx = rawItems.findIndex((r) => r.name === item.name);
        return rawItems[idx]?._tags?.[0] ?? "";
      })
    : postmanItems;

  // Add tag-described folders when doc.tags are present
  const tagDescriptions = new Map(
    (doc.tags ?? []).map((t) => [t.name, t.description]),
  );
  const itemsWithDescriptions = organized.map((item) => {
    if ("item" in item && tagDescriptions.has(item.name)) {
      return { ...item, description: tagDescriptions.get(item.name) };
    }
    return item;
  });

  const authType = opts.authType ?? "bearer";
  const auth = buildCollectionAuth(authType);
  const variables = [
    ...defaultVariables(baseUrl),
    ...(opts.variables ?? []).map((v: PostmanVariable) => ({ ...v })),
  ];

  return makeCollection({
    name,
    description,
    version: doc.info.version,
    items: itemsWithDescriptions,
    auth,
    variables,
  });
}

/** Generate one folder per OpenAPI tag, each containing its operations. */
export function generateFolders(
  doc: OpenApiDocument,
  opts: GeneratorOptions = {},
): PostmanCollection {
  return generateCollection(doc, { ...opts, groupByTag: true });
}

/** Generate a flat collection with no folder grouping. */
export function generateFlat(
  doc: OpenApiDocument,
  opts: GeneratorOptions = {},
): PostmanCollection {
  return generateCollection(doc, { ...opts, groupByTag: false });
}

/** Alias for generateCollection — generate a collection from an OpenAPI document. */
export function generateFromOpenApi(
  doc: OpenApiDocument,
  opts: GeneratorOptions = {},
): PostmanCollection {
  return generateCollection(doc, opts);
}
