// Public surface of @veritas/postman-gen: re-exports all modules for consumers.

// Types
export type {
  PostmanCollection,
  PostmanInfo,
  PostmanItem,
  PostmanItemGroup,
  PostmanRequest,
  PostmanResponse,
  PostmanHeader,
  PostmanUrl,
  PostmanBody,
  PostmanAuth,
  PostmanVariable,
  PostmanEvent,
  PostmanScript,
  CollectionGeneratorOptions,
} from "./types.js";

// Collection model
export {
  makeCollection,
  makeInfo,
  makeCollectionVariable,
} from "./collection.js";

// Folder builders
export {
  makeFolder,
  makeFolderFromTag,
  mergeFolders,
  sortFolders,
} from "./folder.js";

// Request builders
export {
  makeRequest,
  makeRequestItem,
  makeHeader,
  makeUrl,
  makeBody,
} from "./request.js";

// Variable builders
export {
  makeVariable,
  makeStringVariable,
  makeSecretVariable,
  makeBaseUrlVariable,
  defaultCollectionVariables,
} from "./variable.js";

// Auth helpers
export {
  makeAuth,
  bearerAuth,
  apiKeyAuth,
  basicAuth,
  noAuth,
} from "./auth.js";

// Example builders
export {
  makeExample,
  makeSuccessExample,
  makeErrorExample,
} from "./example.js";

// Generator
export {
  generateCollection,
  generateFromOpenApi,
} from "./generator.js";

// Serialization
export {
  serializeCollection,
  serializeToJson,
} from "./serialize.js";

// Errors
export {
  PostmanGenError,
  InvalidCollectionError,
  SerializationError,
  GeneratorError,
} from "./errors.js";
