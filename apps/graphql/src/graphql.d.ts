// Ambient type declarations for the 'graphql' package.
// These stubs cover only what apps/graphql/src uses directly.
declare module "graphql" {
  export class GraphQLError extends Error {
    readonly locations: readonly unknown[] | undefined;
    readonly path: readonly (string | number)[] | undefined;
    readonly extensions: Readonly<Record<string, unknown>>;
    readonly originalError: Error | undefined;
    constructor(
      message: string,
      options?: {
        extensions?: Record<string, unknown>;
        originalError?: Error;
      }
    );
  }

  export interface GraphQLFormattedError {
    readonly message: string;
    readonly locations?: readonly unknown[];
    readonly path?: readonly (string | number)[];
    readonly extensions?: Readonly<Record<string, unknown>>;
  }

  export class GraphQLScalarType {
    constructor(config: {
      name: string;
      description?: string;
      serialize?: (value: unknown) => unknown;
      parseValue?: (value: unknown) => unknown;
      parseLiteral?: (ast: ASTNode) => unknown;
    });
  }

  export interface ASTNode {
    readonly kind: string;
    readonly value?: string | boolean;
    readonly values?: readonly ASTNode[];
  }

  export const Kind: {
    readonly STRING: "StringValue";
    readonly INT: "IntValue";
    readonly FLOAT: "FloatValue";
    readonly BOOLEAN: "BooleanValue";
    readonly NULL: "NullValue";
    readonly LIST: "ListValue";
    readonly OBJECT: "ObjectValue";
  };

  export class GraphQLSchema {
    getTypeMap(): Record<string, unknown>;
  }

  export class GraphQLObjectType {
    readonly astNode?: {
      readonly directives?: readonly DirectiveNode[];
    };
    getFields(): Record<string, GraphQLField<unknown, unknown>>;
  }

  export interface DirectiveNode {
    readonly name: { readonly value: string };
    readonly arguments?: readonly ArgumentNode[];
  }

  export interface ArgumentNode {
    readonly name: { readonly value: string };
    readonly value: ValueNode;
  }

  export type ValueNode =
    | { readonly kind: "StringValue"; readonly value: string }
    | { readonly kind: "IntValue"; readonly value: string }
    | { readonly kind: "FloatValue"; readonly value: string }
    | { readonly kind: "BooleanValue"; readonly value: boolean }
    | { readonly kind: "NullValue" }
    | { readonly kind: "ListValue"; readonly values: readonly ValueNode[] }
    | { readonly kind: "ObjectValue"; readonly fields: readonly unknown[] }
    | { readonly kind: "EnumValue"; readonly value: string }
    | { readonly kind: "Variable"; readonly name: { readonly value: string } };

  export interface GraphQLField<TSource, TContext> {
    readonly astNode?: {
      readonly directives?: readonly DirectiveNode[];
    };
    resolve?: (
      source: TSource,
      args: Record<string, unknown>,
      context: TContext,
      info: unknown
    ) => unknown;
  }

  export const defaultFieldResolver: (
    source: unknown,
    args: Record<string, unknown>,
    context: unknown,
    info: unknown
  ) => unknown;

  export function buildSchema(source: string): GraphQLSchema;

  export interface GraphQLExecutionResult {
    readonly data?: Record<string, unknown> | null;
    readonly errors?: readonly GraphQLError[];
  }

  export function graphql(options: {
    schema: GraphQLSchema;
    source: string;
    variableValues?: Record<string, unknown>;
    operationName?: string;
    contextValue?: unknown;
  }): Promise<GraphQLExecutionResult>;
}
