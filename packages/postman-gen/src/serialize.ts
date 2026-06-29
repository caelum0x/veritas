// Serialize a PostmanCollection to a JSON string for export or file writing.

import { SerializationError } from "./errors.js";
import type { PostmanCollection } from "./types.js";

export interface SerializeOptions {
  readonly pretty?: boolean;
  readonly indentSpaces?: number;
}

const POSTMAN_SCHEMA_V2_1 =
  "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

function ensureSchema(collection: PostmanCollection): PostmanCollection {
  if (collection.info.schema) return collection;
  return {
    ...collection,
    info: { ...collection.info, schema: POSTMAN_SCHEMA_V2_1 },
  };
}

export function serializeCollection(
  collection: PostmanCollection,
  options: SerializeOptions = {},
): string {
  const { pretty = true, indentSpaces = 2 } = options;
  const withSchema = ensureSchema(collection);
  try {
    return pretty
      ? JSON.stringify(withSchema, null, indentSpaces)
      : JSON.stringify(withSchema);
  } catch (err) {
    throw new SerializationError(
      `Failed to serialize Postman collection "${collection.info.name}": ${
        err instanceof Error ? err.message : String(err)
      }`,
      { collectionName: collection.info.name },
    );
  }
}

export function deserializeCollection(raw: string): PostmanCollection {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new SerializationError(
      `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("info" in parsed) ||
    !("item" in parsed)
  ) {
    throw new SerializationError(
      "Parsed value is not a valid Postman collection (missing info or item fields)",
    );
  }

  return parsed as PostmanCollection;
}

export function collectionToExportEnvelope(
  collection: PostmanCollection,
  options: SerializeOptions = {},
): string {
  const withSchema = ensureSchema(collection);
  const envelope = {
    info: {
      _postman_id: withSchema.info._postman_id,
      name: withSchema.info.name,
      description: withSchema.info.description,
      schema: POSTMAN_SCHEMA_V2_1,
      exportedAt: new Date().toISOString(),
      exportedUsing: "@veritas/postman-gen",
    },
    item: withSchema.item,
    auth: withSchema.auth,
    variable: withSchema.variable,
    event: withSchema.event,
  };

  const { pretty = true, indentSpaces = 2 } = options;
  try {
    return pretty
      ? JSON.stringify(envelope, null, indentSpaces)
      : JSON.stringify(envelope);
  } catch (err) {
    throw new SerializationError(
      `Failed to create export envelope: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Alias for serializeCollection — serialize a Postman collection to JSON. */
export function serializeToJson(
  collection: PostmanCollection,
  options: SerializeOptions = {},
): string {
  return serializeCollection(collection, options);
}

export { POSTMAN_SCHEMA_V2_1 };
