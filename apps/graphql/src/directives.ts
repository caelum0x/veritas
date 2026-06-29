// Auth directive: @auth(roles: [String]) enforces principal roles on fields/types
import { GraphQLSchema, defaultFieldResolver, GraphQLObjectType, GraphQLField } from "graphql";
import type { DirectiveNode, ArgumentNode, ValueNode } from "graphql";
import { unauthorized, forbidden } from "./errors.js";
import type { GqlContext } from "./context.js";

export const AUTH_DIRECTIVE_SDL = `
  directive @auth(roles: [String!]) on FIELD_DEFINITION | OBJECT
`;

export interface AuthDirectiveArgs {
  roles?: string[];
}

type ResolverFn = (
  source: unknown,
  args: Record<string, unknown>,
  context: GqlContext,
  info: unknown
) => unknown;

function wrapFieldWithAuth(
  field: GraphQLField<unknown, GqlContext>,
  roles: string[]
): void {
  const { resolve = defaultFieldResolver } = field;

  field.resolve = async function authDirectiveResolver(
    source: unknown,
    args: Record<string, unknown>,
    context: GqlContext,
    info: unknown
  ): Promise<unknown> {
    if (!context.principal) {
      throw unauthorized("Authentication required");
    }

    if (roles.length > 0) {
      const principalRoles: string[] =
        (context.principal as { roles?: string[] }).roles ?? [];
      const hasRole = roles.some((r) => principalRoles.includes(r));
      if (!hasRole) {
        throw forbidden(
          `Requires one of roles: ${roles.join(", ")}`
        );
      }
    }

    return (resolve as ResolverFn)(source, args, context, info);
  };
}

export function applyAuthDirective(schema: GraphQLSchema): GraphQLSchema {
  const typeMap = schema.getTypeMap();

  for (const typeName of Object.keys(typeMap)) {
    const type = typeMap[typeName];
    if (!(type instanceof GraphQLObjectType)) continue;
    if (typeName.startsWith("__")) continue;

    const typeDirectives: readonly DirectiveNode[] = type.astNode?.directives ?? [];
    const typeAuthDirective = typeDirectives.find((d: DirectiveNode) => d.name.value === "auth");
    const typeRoles: string[] = typeAuthDirective
      ? (typeAuthDirective.arguments ?? [])
          .filter((a: ArgumentNode) => a.name.value === "roles")
          .flatMap((a: ArgumentNode) => {
            if (a.value.kind === "ListValue") {
              return (a.value as Extract<ValueNode, { kind: "ListValue" }>).values
                .filter((v: ValueNode) => v.kind === "StringValue")
                .map((v: ValueNode) => (v as Extract<ValueNode, { kind: "StringValue" }>).value);
            }
            return [];
          })
      : [];

    const fields = type.getFields();
    for (const fieldName of Object.keys(fields)) {
      const field = fields[fieldName];
      if (!field) continue;

      const fieldDirectives: readonly DirectiveNode[] = field.astNode?.directives ?? [];
      const fieldAuthDirective = fieldDirectives.find((d: DirectiveNode) => d.name.value === "auth");

      const fieldRoles: string[] = fieldAuthDirective
        ? (fieldAuthDirective.arguments ?? [])
            .filter((a: ArgumentNode) => a.name.value === "roles")
            .flatMap((a: ArgumentNode) => {
              if (a.value.kind === "ListValue") {
                return (a.value as Extract<ValueNode, { kind: "ListValue" }>).values
                  .filter((v: ValueNode) => v.kind === "StringValue")
                  .map((v: ValueNode) => (v as Extract<ValueNode, { kind: "StringValue" }>).value);
              }
              return [];
            })
        : [];

      const effectiveRoles =
        fieldRoles.length > 0
          ? fieldRoles
          : typeRoles.length > 0
          ? typeRoles
          : null;

      if (fieldAuthDirective || typeAuthDirective) {
        wrapFieldWithAuth(field as GraphQLField<unknown, GqlContext>, effectiveRoles ?? []);
      }
    }
  }

  return schema;
}
