// Custom GraphQL scalars: DateTime, JSON, Money for Veritas schema
import { GraphQLScalarType, Kind } from "graphql";
import type { ASTNode } from "graphql";
import type { JsonValue } from "@veritas/core";

export const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO-8601 datetime string",
  serialize(value: unknown): string {
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    throw new TypeError(`DateTime cannot serialize value: ${String(value)}`);
  },
  parseValue(value: unknown): string {
    if (typeof value !== "string") {
      throw new TypeError(`DateTime expects a string, got: ${typeof value}`);
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      throw new TypeError(`DateTime invalid value: ${value}`);
    }
    return value;
  },
  parseLiteral(ast: ASTNode): string {
    if (ast.kind !== Kind.STRING) {
      throw new TypeError(`DateTime literal must be a string`);
    }
    const val = ast.value as string;
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new TypeError(`DateTime invalid literal: ${val}`);
    }
    return val;
  },
});

export const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize(value: unknown): JsonValue {
    return value as JsonValue;
  },
  parseValue(value: unknown): JsonValue {
    return value as JsonValue;
  },
  parseLiteral(ast: ASTNode): JsonValue {
    if (ast.kind === Kind.STRING) {
      const val = ast.value as string;
      try {
        return JSON.parse(val) as JsonValue;
      } catch {
        return val;
      }
    }
    if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
      return parseFloat(ast.value as string);
    }
    if (ast.kind === Kind.BOOLEAN) {
      return ast.value as boolean;
    }
    if (ast.kind === Kind.NULL) {
      return null;
    }
    return null;
  },
});

export const MoneyScalar = new GraphQLScalarType({
  name: "Money",
  description: "USDC amount as integer base units (micro-cents)",
  serialize(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "bigint") return Number(value);
    throw new TypeError(`Money cannot serialize value: ${String(value)}`);
  },
  parseValue(value: unknown): number {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new TypeError(`Money expects an integer, got: ${String(value)}`);
    }
    return value;
  },
  parseLiteral(ast: ASTNode): number {
    if (ast.kind !== Kind.INT) {
      throw new TypeError(`Money literal must be an integer`);
    }
    return parseInt(ast.value as string, 10);
  },
});

export const scalarResolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  Money: MoneyScalar,
} as const;
