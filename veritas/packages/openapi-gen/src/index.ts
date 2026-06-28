// Public surface of @veritas/openapi-gen: re-exports all modules for consumers.

// Core types
export type {
  SchemaType,
  SchemaObject,
  MediaTypeObject,
  ResponseObject,
  ParameterObject,
  RequestBodyObject,
  OperationObject,
  HttpMethod,
  PathItemObject,
  ComponentsObject,
  InfoObject,
  ServerObject,
  TagObject,
  ExternalDocsObject,
  OpenApiDocument,
  RouteDescriptor,
  RegistryOptions,
} from "./types.js";

// Document model
export {
  makeDocument,
  makeInfo,
  makeServer,
} from "./document.js";

export type {
  Info,
  Server,
  ServerVariable,
  Components,
  Operation,
  PathItem,
  Parameter,
  RequestBody,
  Response,
  SecurityRequirement,
  SecurityScheme,
  OAuthFlow,
  OAuthFlows,
  Tag,
  Contact,
  License,
  ExternalDocs,
  JsonSchema,
  MediaType,
  ParameterIn,
  ParameterStyle,
  SecuritySchemeType,
  ApiKeyLocation,
} from "./document.js";

// Zod -> JSON Schema conversion
export { zodToJsonSchema, zodToSchemaWithDescription } from "./zod-to-schema.js";
export type { ConversionOptions } from "./zod-to-schema.js";

// Components builder
export { componentsBuilder, createComponentsBuilder } from "./components.js";
export type {
  ComponentsBuilder,
  ResponseComponentObject,
  ParameterComponentObject,
  SecuritySchemeObject,
  OAuthFlowsObject,
  OAuthFlowObject,
} from "./components.js";

// Parameter builders
export {
  buildParameter,
  pathParam,
  queryParam,
  headerParam,
  cookieParam,
  mergeParameters,
  commonParameters,
} from "./parameter.js";
export type { ParameterLocation, ParameterOptions } from "./parameter.js";

// Response builders
export {
  buildResponse,
  successResponse,
  pageResponse,
  errorResponse,
  noContentResponse,
  refResponse,
  commonResponses,
} from "./response.js";
export type { StatusCode, ContentType, ResponseOptions } from "./response.js";

// Operation builder
export { operation, jsonResponse, emptyResponse } from "./operation.js";
export type { OperationBuilder } from "./operation.js";

// Path item builder
export { pathItem, mergePaths, prefixPaths } from "./path.js";
export type { PathItemBuilder } from "./path.js";

// Security schemes
export {
  apikeyScheme,
  bearerScheme,
  basicScheme,
  oauth2Scheme,
  openIdConnectScheme,
  securityRequirement,
  andSecurity,
  orSecurity,
  veritasSecuritySchemes,
  veritasSecurityRequirements,
} from "./security-scheme.js";
export type { SecurityRequirement as SecurityReq } from "./security-scheme.js";

// Tags
export {
  buildTag,
  externalDocs,
  mergeTags,
  sortTags,
  getTag,
  allVeritasTags,
  veritasTags,
} from "./tag.js";
export type { VeritasTagName } from "./tag.js";

// High-level builder
export { openApiBuilder } from "./builder.js";
export type { OpenApiBuilder } from "./builder.js";

// Route registry
export { createSpecRegistry } from "./registry.js";
export type { SpecRegistry } from "./registry.js";

// Serialization
export { serialize, serializeToJson, serializeToYaml } from "./serialize.js";
export type { SerializeFormat, SerializeOptions } from "./serialize.js";

// Errors
export {
  OpenApiGenError,
  SchemaConversionError,
  DuplicateRouteError,
  MissingComponentError,
  InvalidPathError,
  SerializationError,
} from "./errors.js";
