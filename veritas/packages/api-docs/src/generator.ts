// Generator: transforms an OpenApiDocument into a structured ApiDoc model.

import type { OpenApiDocument, OperationObject, HttpMethod } from "@veritas/openapi-gen";
import { newId } from "@veritas/core";
import type {
  ApiDoc,
  DocEndpoint,
  DocParameter,
  DocRequestBody,
  DocResponse,
  DocTag,
} from "./doc.js";
import { makeDocInfo, makeDocServers, makeDocTagStub, toAnchor } from "./doc.js";

const HTTP_METHODS: readonly HttpMethod[] = [
  "get", "post", "put", "patch", "delete", "head", "options", "trace",
];

function buildParameter(p: NonNullable<OperationObject["parameters"]>[number]): DocParameter {
  return {
    name: p.name,
    location: p.in as DocParameter["location"],
    description: p.description ?? "",
    required: p.required ?? false,
    deprecated: p.deprecated ?? false,
    schema: p.schema as unknown,
    example: p.example ?? null,
  };
}

function buildRequestBody(rb: NonNullable<OperationObject["requestBody"]>): DocRequestBody {
  const contentTypes = Object.keys(rb.content);
  const firstContent = contentTypes.length > 0 ? rb.content[contentTypes[0]!] : undefined;
  return {
    description: rb.description ?? "",
    required: rb.required ?? false,
    contentTypes,
    schema: firstContent?.schema ?? null,
  };
}

function buildResponses(responses: OperationObject["responses"]): readonly DocResponse[] {
  return Object.entries(responses).map(([statusCode, resp]) => {
    const contentTypes = resp.content ? Object.keys(resp.content) : [];
    const firstContent = contentTypes.length > 0 ? resp.content![contentTypes[0]!] : undefined;
    return {
      statusCode,
      description: resp.description,
      contentTypes,
      schema: firstContent?.schema ?? null,
    };
  });
}

function buildEndpoint(method: string, path: string, op: OperationObject): DocEndpoint {
  const security = (op.security ?? [])
    .flatMap((req) => Object.keys(req));

  return {
    operationId: op.operationId ?? `${method}_${toAnchor(path)}`,
    method: method.toUpperCase(),
    path,
    summary: op.summary ?? "",
    description: op.description ?? "",
    tags: op.tags ?? [],
    deprecated: op.deprecated ?? false,
    parameters: (op.parameters ?? []).map(buildParameter),
    requestBody: op.requestBody ? buildRequestBody(op.requestBody) : null,
    responses: buildResponses(op.responses),
    security,
  };
}

function collectEndpoints(doc: OpenApiDocument): readonly DocEndpoint[] {
  const endpoints: DocEndpoint[] = [];
  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (op) {
        endpoints.push(buildEndpoint(method, path, op));
      }
    }
  }
  return endpoints;
}

function groupByTags(
  endpoints: readonly DocEndpoint[],
  tagStubs: readonly Omit<DocTag, "endpoints">[],
): { tags: readonly DocTag[]; untagged: readonly DocEndpoint[] } {
  const tagMap = new Map<string, DocEndpoint[]>(tagStubs.map((t) => [t.name, []]));
  const untagged: DocEndpoint[] = [];

  for (const endpoint of endpoints) {
    if (endpoint.tags.length === 0) {
      untagged.push(endpoint);
    } else {
      let placed = false;
      for (const tagName of endpoint.tags) {
        if (tagMap.has(tagName)) {
          tagMap.get(tagName)!.push(endpoint);
          placed = true;
        }
      }
      if (!placed) untagged.push(endpoint);
    }
  }

  const tags: DocTag[] = tagStubs.map((stub) => ({
    ...stub,
    endpoints: tagMap.get(stub.name) ?? [],
  }));

  return { tags, untagged };
}

/** Generate a structured ApiDoc from a raw OpenApiDocument. */
export function generateDoc(doc: OpenApiDocument): ApiDoc {
  const id = newId("doc");
  const info = makeDocInfo(doc);
  const servers = makeDocServers(doc);
  const tagStubs = (doc.tags ?? []).map(makeDocTagStub);

  const allEndpoints = collectEndpoints(doc);
  const { tags, untagged } = groupByTags(allEndpoints, tagStubs);

  return {
    id,
    info,
    servers,
    tags,
    untaggedEndpoints: untagged,
    generatedAt: new Date().toISOString(),
    sourceDocument: doc,
  };
}
