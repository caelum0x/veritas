// Top-level OpenAPI document builder — assembles all sub-builders into a final document

import type {
  OpenApiDocument,
  Info,
  Server,
  Components,
  Tag,
  SecurityRequirement,
  ExternalDocs,
  PathItem,
  JsonSchema,
  Response,
  Parameter,
  RequestBody,
  SecurityScheme,
} from './document.js';
import { makeDocument } from './document.js';
import { mergePaths, prefixPaths } from './path.js';

interface BuilderState {
  readonly info: Info;
  readonly servers: readonly Server[];
  readonly paths: Readonly<Record<string, PathItem>>;
  readonly schemas: Readonly<Record<string, JsonSchema>>;
  readonly responses: Readonly<Record<string, Response>>;
  readonly parameters: Readonly<Record<string, Parameter>>;
  readonly requestBodies: Readonly<Record<string, RequestBody>>;
  readonly securitySchemes: Readonly<Record<string, SecurityScheme>>;
  readonly tags: readonly Tag[];
  readonly security: readonly SecurityRequirement[];
  readonly externalDocs?: ExternalDocs;
}

export interface OpenApiBuilder {
  server(url: string, description?: string): OpenApiBuilder;
  path(path: string, item: PathItem): OpenApiBuilder;
  paths(map: Readonly<Record<string, PathItem>>): OpenApiBuilder;
  pathGroup(prefix: string, map: Readonly<Record<string, PathItem>>): OpenApiBuilder;
  schema(name: string, schema: JsonSchema): OpenApiBuilder;
  response(name: string, response: Response): OpenApiBuilder;
  parameter(name: string, parameter: Parameter): OpenApiBuilder;
  requestBody(name: string, body: RequestBody): OpenApiBuilder;
  securityScheme(name: string, scheme: SecurityScheme): OpenApiBuilder;
  tag(tag: Tag): OpenApiBuilder;
  security(requirement: SecurityRequirement): OpenApiBuilder;
  externalDocs(docs: ExternalDocs): OpenApiBuilder;
  build(): OpenApiDocument;
}

function createBuilder(state: BuilderState): OpenApiBuilder {
  return {
    server(url, description) {
      const s: Server = description !== undefined ? { url, description } : { url };
      return createBuilder({ ...state, servers: [...state.servers, s] });
    },

    path(path, item) {
      return createBuilder({
        ...state,
        paths: mergePaths(state.paths, { [path]: item }),
      });
    },

    paths(map) {
      return createBuilder({
        ...state,
        paths: mergePaths(state.paths, map),
      });
    },

    pathGroup(prefix, map) {
      return createBuilder({
        ...state,
        paths: mergePaths(state.paths, prefixPaths(prefix, map)),
      });
    },

    schema(name, schema) {
      return createBuilder({
        ...state,
        schemas: { ...state.schemas, [name]: schema },
      });
    },

    response(name, response) {
      return createBuilder({
        ...state,
        responses: { ...state.responses, [name]: response },
      });
    },

    parameter(name, parameter) {
      return createBuilder({
        ...state,
        parameters: { ...state.parameters, [name]: parameter },
      });
    },

    requestBody(name, body) {
      return createBuilder({
        ...state,
        requestBodies: { ...state.requestBodies, [name]: body },
      });
    },

    securityScheme(name, scheme) {
      return createBuilder({
        ...state,
        securitySchemes: { ...state.securitySchemes, [name]: scheme },
      });
    },

    tag(tag) {
      return createBuilder({ ...state, tags: [...state.tags, tag] });
    },

    security(requirement) {
      return createBuilder({ ...state, security: [...state.security, requirement] });
    },

    externalDocs(docs) {
      return createBuilder({ ...state, externalDocs: docs });
    },

    build(): OpenApiDocument {
      const components: Components = {
        ...(Object.keys(state.schemas).length > 0 ? { schemas: state.schemas } : {}),
        ...(Object.keys(state.responses).length > 0 ? { responses: state.responses } : {}),
        ...(Object.keys(state.parameters).length > 0 ? { parameters: state.parameters } : {}),
        ...(Object.keys(state.requestBodies).length > 0 ? { requestBodies: state.requestBodies } : {}),
        ...(Object.keys(state.securitySchemes).length > 0 ? { securitySchemes: state.securitySchemes } : {}),
      };

      return makeDocument(state.info, state.paths, {
        ...(state.servers.length > 0 ? { servers: state.servers } : {}),
        ...(Object.keys(components).length > 0 ? { components } : {}),
        ...(state.tags.length > 0 ? { tags: state.tags } : {}),
        ...(state.security.length > 0 ? { security: state.security } : {}),
        ...(state.externalDocs !== undefined ? { externalDocs: state.externalDocs } : {}),
      });
    },
  };
}

export function openApiBuilder(info: Info): OpenApiBuilder {
  return createBuilder({
    info,
    servers: [],
    paths: {},
    schemas: {},
    responses: {},
    parameters: {},
    requestBodies: {},
    securitySchemes: {},
    tags: [],
    security: [],
  });
}

export type { Components };
