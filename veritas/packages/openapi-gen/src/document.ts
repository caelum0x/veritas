// OpenAPI 3.1 document model types and constructors

export interface Contact {
  readonly name?: string;
  readonly url?: string;
  readonly email?: string;
}

export interface License {
  readonly name: string;
  readonly url?: string;
}

export interface Info {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
  readonly termsOfService?: string;
  readonly contact?: Contact;
  readonly license?: License;
}

export interface ServerVariable {
  readonly enum?: readonly string[];
  readonly default: string;
  readonly description?: string;
}

export interface Server {
  readonly url: string;
  readonly description?: string;
  readonly variables?: Readonly<Record<string, ServerVariable>>;
}

export interface ExternalDocs {
  readonly url: string;
  readonly description?: string;
}

export type SchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';

export interface JsonSchema {
  readonly type?: SchemaType | readonly SchemaType[];
  readonly format?: string;
  readonly description?: string;
  readonly title?: string;
  readonly default?: unknown;
  readonly example?: unknown;
  readonly enum?: readonly unknown[];
  readonly const?: unknown;
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean | JsonSchema;
  readonly items?: JsonSchema;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly nullable?: boolean;
  readonly anyOf?: readonly JsonSchema[];
  readonly oneOf?: readonly JsonSchema[];
  readonly allOf?: readonly JsonSchema[];
  readonly $ref?: string;
}

export interface MediaType {
  readonly schema?: JsonSchema;
  readonly example?: unknown;
  readonly examples?: Readonly<Record<string, unknown>>;
}

export interface RequestBody {
  readonly description?: string;
  readonly content: Readonly<Record<string, MediaType>>;
  readonly required?: boolean;
}

export type ParameterIn = 'query' | 'header' | 'path' | 'cookie';
export type ParameterStyle = 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';

export interface Parameter {
  readonly name: string;
  readonly in: ParameterIn;
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly schema?: JsonSchema;
  readonly style?: ParameterStyle;
  readonly explode?: boolean;
}

export interface Response {
  readonly description: string;
  readonly content?: Readonly<Record<string, MediaType>>;
  readonly headers?: Readonly<Record<string, Parameter>>;
}

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace';

export interface SecurityRequirement {
  readonly [name: string]: readonly string[];
}

export interface Operation {
  readonly operationId?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly parameters?: readonly Parameter[];
  readonly requestBody?: RequestBody;
  readonly responses: Readonly<Record<string, Response>>;
  readonly security?: readonly SecurityRequirement[];
  readonly deprecated?: boolean;
  readonly externalDocs?: ExternalDocs;
}

export type PathItem = Partial<Readonly<Record<HttpMethod, Operation>>>;

export interface OAuthFlow {
  readonly authorizationUrl?: string;
  readonly tokenUrl?: string;
  readonly refreshUrl?: string;
  readonly scopes: Readonly<Record<string, string>>;
}

export interface OAuthFlows {
  readonly implicit?: OAuthFlow;
  readonly password?: OAuthFlow;
  readonly clientCredentials?: OAuthFlow;
  readonly authorizationCode?: OAuthFlow;
}

export type SecuritySchemeType = 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
export type ApiKeyLocation = 'query' | 'header' | 'cookie';

export interface SecurityScheme {
  readonly type: SecuritySchemeType;
  readonly description?: string;
  readonly name?: string;
  readonly in?: ApiKeyLocation;
  readonly scheme?: string;
  readonly bearerFormat?: string;
  readonly flows?: OAuthFlows;
  readonly openIdConnectUrl?: string;
}

export interface Tag {
  readonly name: string;
  readonly description?: string;
  readonly externalDocs?: ExternalDocs;
}

export interface Components {
  readonly schemas?: Readonly<Record<string, JsonSchema>>;
  readonly responses?: Readonly<Record<string, Response>>;
  readonly parameters?: Readonly<Record<string, Parameter>>;
  readonly requestBodies?: Readonly<Record<string, RequestBody>>;
  readonly securitySchemes?: Readonly<Record<string, SecurityScheme>>;
}

export interface OpenApiDocument {
  readonly openapi: '3.1.0';
  readonly info: Info;
  readonly servers?: readonly Server[];
  readonly paths: Readonly<Record<string, PathItem>>;
  readonly components?: Components;
  readonly tags?: readonly Tag[];
  readonly security?: readonly SecurityRequirement[];
  readonly externalDocs?: ExternalDocs;
}

export function makeDocument(
  info: Info,
  paths: Readonly<Record<string, PathItem>>,
  options?: {
    readonly servers?: readonly Server[];
    readonly components?: Components;
    readonly tags?: readonly Tag[];
    readonly security?: readonly SecurityRequirement[];
    readonly externalDocs?: ExternalDocs;
  }
): OpenApiDocument {
  return {
    openapi: '3.1.0',
    info,
    paths,
    ...options,
  };
}

export function makeInfo(
  title: string,
  version: string,
  options?: Omit<Info, 'title' | 'version'>
): Info {
  return { title, version, ...options };
}

export function makeServer(url: string, description?: string): Server {
  return description !== undefined ? { url, description } : { url };
}
