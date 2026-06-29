// Public surface of @veritas/warehouse.
export type {
  ColumnType,
  Aggregation,
  SortDirection,
  PartitionStrategy,
  TableKind,
  ColumnDef,
  TableRef,
  RowRecord,
  QueryFilter,
  QuerySort,
  QueryOptions,
  QueryResult,
  LoadResult,
} from "./types.js";

export {
  ColumnTypeSchema,
  AggregationSchema,
  SortDirectionSchema,
  PartitionStrategySchema,
  TableKindSchema,
} from "./types.js";

export {
  TableNotFoundError,
  TableAlreadyExistsError,
  SchemaNotFoundError,
  ColumnNotFoundError,
  InvalidQueryError,
  LoadError,
  PartitionError,
} from "./errors.js";

export type { TableEntry, CatalogSnapshot } from "./catalog.js";
export { TableCatalog } from "./catalog.js";
