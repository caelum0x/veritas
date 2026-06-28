// Postman Collection v2.1 model: constructors and type-safe builders.

import { newId } from "@veritas/core";
import type {
  PostmanCollection,
  PostmanInfo,
  PostmanItem,
  PostmanFolder,
  PostmanVariable,
  PostmanAuth,
  CollectionItem,
} from "./types.js";

const POSTMAN_SCHEMA = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

/** Create a PostmanInfo block for the collection. */
export function makeCollectionInfo(
  name: string,
  description?: string,
  version?: string,
): PostmanInfo {
  return {
    name,
    description,
    version,
    schema: POSTMAN_SCHEMA,
    _postman_id: newId("collection"),
  };
}

/** Construct a complete PostmanCollection from its parts. */
export function makeCollection(opts: {
  readonly name: string;
  readonly description?: string;
  readonly version?: string;
  readonly items: readonly CollectionItem[];
  readonly auth?: PostmanAuth;
  readonly variables?: readonly PostmanVariable[];
}): PostmanCollection {
  return {
    info: makeCollectionInfo(opts.name, opts.description, opts.version),
    item: opts.items,
    auth: opts.auth,
    variable: opts.variables,
  };
}

/** Append items to an existing collection (immutably). */
export function appendItems(
  collection: PostmanCollection,
  items: readonly CollectionItem[],
): PostmanCollection {
  return { ...collection, item: [...collection.item, ...items] };
}

/** Add variables to an existing collection (immutably). */
export function appendVariables(
  collection: PostmanCollection,
  variables: readonly PostmanVariable[],
): PostmanCollection {
  const existing = collection.variable ?? [];
  return { ...collection, variable: [...existing, ...variables] };
}

/** Set or replace the root-level auth on a collection (immutably). */
export function withCollectionAuth(
  collection: PostmanCollection,
  auth: PostmanAuth,
): PostmanCollection {
  return { ...collection, auth };
}

/** Merge two collections: items and variables are concatenated. */
export function mergeCollections(
  base: PostmanCollection,
  other: PostmanCollection,
): PostmanCollection {
  const variables = [
    ...(base.variable ?? []),
    ...(other.variable ?? []),
  ];
  return {
    ...base,
    item: [...base.item, ...other.item],
    variable: variables.length > 0 ? variables : undefined,
  };
}

/** Alias for makeCollectionInfo used in the public API. */
export function makeInfo(
  name: string,
  description?: string,
  version?: string,
): PostmanInfo {
  return makeCollectionInfo(name, description, version);
}

/** Create a single named collection variable. */
export function makeCollectionVariable(
  key: string,
  value: string,
  description?: string,
): PostmanVariable {
  return { key, value, description, type: "string" };
}

export type { PostmanCollection, PostmanItem, PostmanFolder };
