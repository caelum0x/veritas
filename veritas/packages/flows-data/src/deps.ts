// Dependency ports for flows-data flows — injected at construction time.
import type { Logger, EventBus } from "@veritas/core";
import type { DataSource, DataSink, TransformStep } from "@veritas/etl";
import type { EtlRecord } from "@veritas/etl";
import type { TableRef, RowRecord, QueryResult, LoadResult as WhLoadResult } from "@veritas/warehouse";
import type { AnalyticsStore } from "@veritas/analytics";
import type { ReportStore, ReportDelivery } from "@veritas/reporting";

/** Warehouse write/query port used by data flows. */
export interface WarehousePort {
  load(table: TableRef, rows: readonly RowRecord[]): Promise<WhLoadResult>;
  query(table: TableRef, options?: { limit?: number; offset?: number }): Promise<QueryResult>;
}

/** Ports required by EtlLoadFlow. */
export interface EtlLoadFlowDeps {
  readonly source: DataSource;
  readonly transformSteps: readonly TransformStep[];
  readonly sink: DataSink<EtlRecord>;
  readonly warehouse: WarehousePort;
  readonly logger: Logger;
  readonly eventBus: EventBus;
}

/** Ports required by ReportGenerateFlow. */
export interface ReportGenerateFlowDeps {
  readonly reportStore: ReportStore;
  readonly deliveryChannels: readonly ReportDelivery[];
  readonly logger: Logger;
  readonly eventBus: EventBus;
}

/** Ports required by UsageRollupFlow. */
export interface UsageRollupFlowDeps {
  readonly analyticsStore: AnalyticsStore;
  readonly warehouse: WarehousePort;
  readonly logger: Logger;
  readonly eventBus: EventBus;
}

/** Ports required by VerificationAnalyticsFlow. */
export interface VerificationAnalyticsFlowDeps {
  readonly reportStore: ReportStore;
  readonly analyticsStore: AnalyticsStore;
  readonly logger: Logger;
  readonly eventBus: EventBus;
}
