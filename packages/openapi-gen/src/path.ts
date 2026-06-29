// Path item builder for OpenAPI path objects

import type { PathItem, Operation, HttpMethod } from './document.js';

export interface PathItemBuilder {
  get(op: Operation): PathItemBuilder;
  post(op: Operation): PathItemBuilder;
  put(op: Operation): PathItemBuilder;
  patch(op: Operation): PathItemBuilder;
  delete(op: Operation): PathItemBuilder;
  head(op: Operation): PathItemBuilder;
  options(op: Operation): PathItemBuilder;
  trace(op: Operation): PathItemBuilder;
  build(): PathItem;
}

function createPathItemBuilder(initial: PathItem = {}): PathItemBuilder {
  const item: Partial<Record<HttpMethod, Operation>> = { ...initial };

  const self: PathItemBuilder = {
    get(op) {
      return createPathItemBuilder({ ...item, get: op });
    },
    post(op) {
      return createPathItemBuilder({ ...item, post: op });
    },
    put(op) {
      return createPathItemBuilder({ ...item, put: op });
    },
    patch(op) {
      return createPathItemBuilder({ ...item, patch: op });
    },
    delete(op) {
      return createPathItemBuilder({ ...item, delete: op });
    },
    head(op) {
      return createPathItemBuilder({ ...item, head: op });
    },
    options(op) {
      return createPathItemBuilder({ ...item, options: op });
    },
    trace(op) {
      return createPathItemBuilder({ ...item, trace: op });
    },
    build() {
      return Object.freeze({ ...item });
    },
  };

  return self;
}

export function pathItem(initial?: PathItem): PathItemBuilder {
  return createPathItemBuilder(initial);
}

export function mergePaths(
  ...pathMaps: readonly Readonly<Record<string, PathItem>>[]
): Readonly<Record<string, PathItem>> {
  const result: Record<string, PathItem> = {};
  for (const map of pathMaps) {
    for (const [path, item] of Object.entries(map)) {
      if (path in result) {
        result[path] = { ...result[path], ...item };
      } else {
        result[path] = item;
      }
    }
  }
  return Object.freeze(result);
}

export function prefixPaths(
  prefix: string,
  paths: Readonly<Record<string, PathItem>>
): Readonly<Record<string, PathItem>> {
  const result: Record<string, PathItem> = {};
  const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  for (const [path, item] of Object.entries(paths)) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    result[`${normalizedPrefix}${normalizedPath}`] = item;
  }
  return Object.freeze(result);
}
