// Public surface of @veritas/query-engine: re-exports all query-engine modules.

// Query AST
export type {
  ComparisonOp,
  LogicalOp,
  AggFn,
  SortDir,
  ColumnRef,
  LiteralExpr,
  AggExpr,
  ScalarExpr,
  ComparisonPredicate,
  LogicalPredicate,
  Predicate,
  ProjectionItem,
  TableSource,
  JoinType,
  JoinClause,
  OrderByItem,
  SelectQuery,
} from "./query.js";
export { ComparisonOpSchema, LogicalOpSchema, AggFnSchema, SortDirSchema, JoinTypeSchema } from "./query.js";
export { columnRef, literal, makeSelect } from "./query.js";

// Parser
export { parseQuery } from "./parser.js";

// Predicate evaluation
export { evaluatePredicates, buildPredicate } from "./predicate.js";

// Projection
export { projectRow, applyProjection, inferColumns } from "./projection.js";

// Aggregation
export type { AggregateSpec } from "./aggregate.js";
export { applyAggregation } from "./aggregate.js";

// Join
export type { JoinCondition, JoinSpec } from "./join.js";
export { executeJoin } from "./join.js";

// Sort / limit
export { applySort, applyLimitOffset, applySortAndLimit } from "./sort.js";

// Result set
export type { ResultColumn, ResultSet } from "./result-set.js";
export {
  makeResultSet,
  sliceResultSet,
  mapResultSet,
  filterResultSet,
  pluckColumn,
  emptyResultSet,
} from "./result-set.js";

// Types
export type {
  DataSource,
  DataSourceRegistry,
  ExecutionContext,
  PlanNodeKind,
  ScanNode,
  FilterNode,
  ProjectNode,
  JoinNode,
  AggregateNode,
  AggregationSpec,
  SortNode,
  LimitNode,
  PlanNode,
  QueryPlan,
  QueryEngineConfig,
} from "./types.js";
export { DEFAULT_ENGINE_CONFIG } from "./types.js";

// Errors
export {
  QueryParseError,
  QueryPlanError,
  QueryExecutionError,
  QueryTimeoutError,
  InvalidProjectionError,
  InvalidJoinError,
} from "./errors.js";
export type { QueryEngineError } from "./errors.js";
