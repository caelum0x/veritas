// Core Postman Collection v2.1 TypeScript type definitions for postman-gen.

export type PostmanAuthType =
  | "apikey"
  | "bearer"
  | "basic"
  | "oauth2"
  | "noauth"
  | "inherit";

export interface PostmanKeyValue {
  readonly key: string;
  readonly value: string;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly type?: string;
}

export interface PostmanUrl {
  readonly raw: string;
  readonly protocol?: string;
  readonly host?: readonly string[];
  readonly path?: readonly string[];
  readonly query?: readonly PostmanKeyValue[];
  readonly variable?: readonly PostmanKeyValue[];
}

export interface PostmanHeader {
  readonly key: string;
  readonly value: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export interface PostmanBody {
  readonly mode: "raw" | "urlencoded" | "formdata" | "file" | "graphql" | "none";
  readonly raw?: string;
  readonly options?: {
    readonly raw?: { readonly language?: "json" | "xml" | "text" | "html" | "javascript" };
  };
  readonly urlencoded?: readonly PostmanKeyValue[];
  readonly formdata?: readonly PostmanKeyValue[];
}

export interface PostmanRequest {
  readonly name: string;
  readonly description?: string;
  readonly method: string;
  readonly url: PostmanUrl;
  readonly header?: readonly PostmanHeader[];
  readonly body?: PostmanBody;
  readonly auth?: PostmanAuth;
}

export interface PostmanAuthAttribute {
  readonly key: string;
  readonly value: string;
  readonly type?: string;
}

export interface PostmanAuth {
  readonly type: PostmanAuthType;
  readonly apikey?: readonly PostmanAuthAttribute[];
  readonly bearer?: readonly PostmanAuthAttribute[];
  readonly basic?: readonly PostmanAuthAttribute[];
  readonly oauth2?: readonly PostmanAuthAttribute[];
}

export interface PostmanResponse {
  readonly name: string;
  readonly status: string;
  readonly code: number;
  readonly header?: readonly PostmanHeader[];
  readonly body?: string;
  readonly originalRequest?: PostmanRequest;
}

export interface PostmanItem {
  readonly name: string;
  readonly description?: string;
  readonly request: PostmanRequest;
  readonly response?: readonly PostmanResponse[];
}

export interface PostmanFolder {
  readonly name: string;
  readonly description?: string;
  readonly item: readonly (PostmanItem | PostmanFolder)[];
  readonly auth?: PostmanAuth;
}

export interface PostmanVariable {
  readonly id?: string;
  readonly key: string;
  readonly value: string;
  readonly description?: string;
  readonly type?: "string" | "secret" | "boolean" | "number" | "any";
  readonly disabled?: boolean;
}

export interface PostmanInfo {
  readonly name: string;
  readonly description?: string;
  readonly version?: string;
  readonly schema: string;
  readonly _postman_id?: string;
}

export interface PostmanCollection {
  readonly info: PostmanInfo;
  readonly item: readonly (PostmanItem | PostmanFolder)[];
  readonly auth?: PostmanAuth;
  readonly variable?: readonly PostmanVariable[];
  readonly event?: readonly unknown[];
}

export type CollectionItem = PostmanItem | PostmanFolder;

/** Alias for PostmanFolder, used in public-facing API. */
export type PostmanItemGroup = PostmanFolder;

/** A test/pre-request script event attached to a collection or item. */
export interface PostmanScript {
  readonly type: string;
  readonly exec: readonly string[];
}

/** An event (pre-request or test) attached to a collection or item. */
export interface PostmanEvent {
  readonly listen: "prerequest" | "test";
  readonly script: PostmanScript;
}

/** Options for generating a Postman collection from an OpenAPI document. */
export interface GeneratorOptions {
  readonly baseUrl?: string;
  readonly collectionName?: string;
  readonly description?: string;
  readonly groupByTag?: boolean;
  readonly authType?: string;
  readonly variables?: readonly PostmanVariable[];
}

/** Alias for GeneratorOptions, used in public-facing API. */
export type CollectionGeneratorOptions = GeneratorOptions;

export function isFolder(item: CollectionItem): item is PostmanFolder {
  return "item" in item;
}

export function isRequest(item: CollectionItem): item is PostmanItem {
  return "request" in item;
}
