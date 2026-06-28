// Public surface of @veritas/olap — re-exports all OLAP primitives.

// Types & schemas
export {
  AggregationFnSchema,
  type AggregationFn,
  SortDirectionSchema,
  type SortDirection,
  GranularitySchema,
  type Granularity,
  type CellValue,
  type CoordKey,
  type ResultMatrix,
  type DimensionCoord,
  encodeCoord,
  FilterOpSchema,
  type FilterOp,
  QueryFilterSchema,
  type QueryFilter,
  QuerySortSchema,
  type QuerySort,
  OlapQuerySchema,
  type OlapQuery,
  type OlapCell,
  type OlapResult,
  DrillDirectionSchema,
  type DrillDirection,
  DrillRequestSchema,
  type DrillRequest,
  SliceRequestSchema,
  type SliceRequest,
  DiceRequestSchema,
  type DiceRequest,
  PivotRequestSchema,
  type PivotRequest,
  type PivotTable,
  RollupDefinitionSchema,
  type RollupDefinition,
  type RollupEntry,
  type OlapWarehousePort,
} from "./types.js";

// Errors
export {
  CubeNotFoundError,
  MeasureNotFoundError,
  DimensionNotFoundError,
  InvalidSliceError,
  InvalidDrillError,
  AggregationError,
  QueryError,
} from "./errors.js";

// Measures
export {
  MeasureSchema,
  type Measure,
  makeMeasure,
  aggregate,
  formatMeasure,
} from "./measure.js";

// Dimensions
export {
  DimensionAttributeSchema,
  type DimensionAttribute,
  HierarchyLevelSchema,
  type HierarchyLevel,
  DimensionTypeSchema,
  type DimensionType,
  CubeDimensionSchema,
  type CubeDimension,
  makeDimension,
  finestLevel,
  coarsestLevel,
  levelIndex,
} from "./dimension.js";
