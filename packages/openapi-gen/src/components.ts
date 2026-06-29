// OpenAPI components/schemas registry for reusable schema definitions.
import type { SchemaObject, ComponentsObject } from "./types.js";

export interface ComponentsBuilder {
  addSchema(name: string, schema: SchemaObject): ComponentsBuilder;
  addResponse(name: string, response: ResponseComponentObject): ComponentsBuilder;
  addParameter(name: string, parameter: ParameterComponentObject): ComponentsBuilder;
  addSecurityScheme(name: string, scheme: SecuritySchemeObject): ComponentsBuilder;
  build(): ComponentsObject;
  hasSchema(name: string): boolean;
  getSchema(name: string): SchemaObject | undefined;
}

export interface ResponseComponentObject {
  readonly description: string;
  readonly content?: Record<string, { schema: SchemaObject }>;
  readonly headers?: Record<string, { schema: SchemaObject; description?: string }>;
}

export interface ParameterComponentObject {
  readonly name: string;
  readonly in: "query" | "header" | "path" | "cookie";
  readonly description?: string;
  readonly required?: boolean;
  readonly schema: SchemaObject;
}

export interface SecuritySchemeObject {
  readonly type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  readonly description?: string;
  readonly name?: string;
  readonly in?: "query" | "header" | "cookie";
  readonly scheme?: string;
  readonly bearerFormat?: string;
  readonly flows?: OAuthFlowsObject;
  readonly openIdConnectUrl?: string;
}

export interface OAuthFlowsObject {
  readonly implicit?: OAuthFlowObject;
  readonly password?: OAuthFlowObject;
  readonly clientCredentials?: OAuthFlowObject;
  readonly authorizationCode?: OAuthFlowObject;
}

export interface OAuthFlowObject {
  readonly authorizationUrl?: string;
  readonly tokenUrl?: string;
  readonly refreshUrl?: string;
  readonly scopes: Record<string, string>;
}

interface MutableComponents {
  schemas: Record<string, SchemaObject>;
  responses: Record<string, ResponseComponentObject>;
  parameters: Record<string, ParameterComponentObject>;
  securitySchemes: Record<string, SecuritySchemeObject>;
}

export function createComponentsBuilder(): ComponentsBuilder {
  const components: MutableComponents = {
    schemas: {},
    responses: {},
    parameters: {},
    securitySchemes: {},
  };

  const builder: ComponentsBuilder = {
    addSchema(name, schema) {
      return _buildFromState({
        ...components,
        schemas: { ...components.schemas, [name]: schema },
      });
    },

    addResponse(name, response) {
      return _buildFromState({
        ...components,
        responses: { ...components.responses, [name]: response },
      });
    },

    addParameter(name, parameter) {
      return _buildFromState({
        ...components,
        parameters: { ...components.parameters, [name]: parameter },
      });
    },

    addSecurityScheme(name, scheme) {
      return _buildFromState({
        ...components,
        securitySchemes: { ...components.securitySchemes, [name]: scheme },
      });
    },

    hasSchema(name) {
      return Object.prototype.hasOwnProperty.call(components.schemas, name);
    },

    getSchema(name) {
      return components.schemas[name];
    },

    build(): ComponentsObject {
      const result: ComponentsObject = {};
      if (Object.keys(components.schemas).length > 0) result.schemas = { ...components.schemas };
      if (Object.keys(components.responses).length > 0) result.responses = { ...components.responses };
      if (Object.keys(components.parameters).length > 0) result.parameters = { ...components.parameters };
      if (Object.keys(components.securitySchemes).length > 0) result.securitySchemes = { ...components.securitySchemes };
      return result;
    },
  };

  return builder;
}

function _buildFromState(state: {
  schemas: Record<string, SchemaObject>;
  responses: Record<string, ResponseComponentObject>;
  parameters: Record<string, ParameterComponentObject>;
  securitySchemes: Record<string, SecuritySchemeObject>;
}): ComponentsBuilder {
  return {
    addSchema(name, schema) {
      return _buildFromState({ ...state, schemas: { ...state.schemas, [name]: schema } });
    },
    addResponse(name, response) {
      return _buildFromState({ ...state, responses: { ...state.responses, [name]: response } });
    },
    addParameter(name, parameter) {
      return _buildFromState({ ...state, parameters: { ...state.parameters, [name]: parameter } });
    },
    addSecurityScheme(name, scheme) {
      return _buildFromState({ ...state, securitySchemes: { ...state.securitySchemes, [name]: scheme } });
    },
    hasSchema(name) {
      return Object.prototype.hasOwnProperty.call(state.schemas, name);
    },
    getSchema(name) {
      return state.schemas[name];
    },
    build(): ComponentsObject {
      const result: ComponentsObject = {};
      if (Object.keys(state.schemas).length > 0) result.schemas = { ...state.schemas };
      if (Object.keys(state.responses).length > 0) result.responses = { ...state.responses };
      if (Object.keys(state.parameters).length > 0) result.parameters = { ...state.parameters };
      if (Object.keys(state.securitySchemes).length > 0) result.securitySchemes = { ...state.securitySchemes };
      return result;
    },
  };
}

export function componentsBuilder(): ComponentsBuilder {
  return _buildFromState({ schemas: {}, responses: {}, parameters: {}, securitySchemes: {} });
}
