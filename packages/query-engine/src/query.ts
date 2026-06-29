// Query AST — defines the immutable node types that represent a parsed query.
import { z } from "zod";

export const ComparisonOpSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "like"]);
export type ComparisonOp = z.infer<typeof ComparisonOpSchema>;

export const LogicalOpSchema = z.enum(["and", "or", "not"]);
export type LogicalOp = z.infer<typeof LogicalOpSchema>;

export const AggFnSchema = z.enum(["sum", "count", "avg", "min", "max", "count_distinct"]);
export type AggFn = z.infer<typeof AggFnSchema>;

export const SortDirSchema = z.enum(["asc", "desc"]);
export type SortDir = z.infer<typeof SortDirSchema>;

// ── Scalar expressions ──────────────────────────────────────────────────────

export interface ColumnRef {
  readonly kind: "column";
  readonly table?: string;
  readonly name: string;
}

export interface LiteralExpr {
  readonly kind: "literal";
  readonly value: string | number | boolean | null;
}

export interface AggExpr {
  readonly kind: "agg";
  readonly fn: AggFn;
  readonly column: ColumnRef | LiteralExpr;
  readonly alias?: string;
}

export type ScalarExpr = ColumnRef | LiteralExpr | AggExpr;

// ── Predicates ──────────────────────────────────────────────────────────────

export interface ComparisonPredicate {
  readonly kind: "comparison";
  readonly left: ScalarExpr;
  readonly op: ComparisonOp;
  readonly right: ScalarExpr;
}

export interface LogicalPredicate {
  readonly kind: "logical";
  readonly op: LogicalOp;
  readonly operands: readonly Predicate[];
}

export type Predicate = ComparisonPredicate | LogicalPredicate;

// ── Projections ─────────────────────────────────────────────────────────────

export interface ProjectionItem {
  readonly expr: ScalarExpr;
  readonly alias?: string;
}

// ── Table source ─────────────────────────────────────────────────────────────

export interface TableSource {
  readonly schema: string;
  readonly name: string;
  readonly alias?: string;
}

// ── Join ─────────────────────────────────────────────────────────────────────

export const JoinTypeSchema = z.enum(["inner", "left", "right", "full"]);
export type JoinType = z.infer<typeof JoinTypeSchema>;

export interface JoinClause {
  readonly kind: "join";
  readonly joinType: JoinType;
  readonly right: TableSource;
  readonly on: Predicate;
}

// ── Order / Group ────────────────────────────────────────────────────────────

export interface OrderByItem {
  readonly expr: ScalarExpr;
  readonly dir: SortDir;
}

// ── Top-level SelectQuery AST node ──────────────────────────────────────────

export interface SelectQuery {
  readonly kind: "select";
  readonly from: TableSource;
  readonly joins: readonly JoinClause[];
  readonly projections: readonly ProjectionItem[];
  readonly where?: Predicate;
  readonly groupBy: readonly ColumnRef[];
  readonly having?: Predicate;
  readonly orderBy: readonly OrderByItem[];
  readonly limit?: number;
  readonly offset?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function columnRef(name: string, table?: string): ColumnRef {
  return { kind: "column", name, ...(table ? { table } : {}) };
}

export function literal(value: string | number | boolean | null): LiteralExpr {
  return { kind: "literal", value };
}

export function makeSelect(from: TableSource): SelectQuery {
  return {
    kind: "select",
    from,
    joins: [],
    projections: [],
    groupBy: [],
    orderBy: [],
  };
}
