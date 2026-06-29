// BI tool connector port: defines the interface and an in-memory implementation for pushing exports to BI tools.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { ExportResult } from "./types.js";
import { DestinationUnreachableError } from "./errors.js";

/** Configuration for a BI connector endpoint. */
export interface BiConnectorConfig {
  readonly id: string;
  readonly name: string;
  readonly kind: "tableau" | "looker" | "metabase" | "superset" | "custom";
  readonly endpointUrl: string;
  readonly apiKey?: string;
}

/** Result returned after pushing data to a BI tool. */
export interface BiPushResult {
  readonly connectorId: string;
  readonly bytesDelivered: number;
  readonly rowsDelivered: number;
  readonly pushedAt: string;
}

/** Port interface for BI tool connectors. */
export interface BiConnector {
  /** Push an export result to the connected BI tool. */
  push(exportResult: ExportResult): Promise<Result<BiPushResult>>;

  /** Test connectivity to the BI tool endpoint. */
  ping(): Promise<Result<void>>;
}

/** In-memory BI connector that records pushes without network I/O. */
export class InMemoryBiConnector implements BiConnector {
  readonly config: BiConnectorConfig;
  private readonly _pushLog: BiPushResult[] = [];

  constructor(config: BiConnectorConfig) {
    this.config = config;
  }

  async push(exportResult: ExportResult): Promise<Result<BiPushResult>> {
    const result: BiPushResult = {
      connectorId: this.config.id,
      bytesDelivered: exportResult.byteSize,
      rowsDelivered: exportResult.rowCount,
      pushedAt: new Date().toISOString(),
    };
    this._pushLog.push(result);
    return ok(result);
  }

  async ping(): Promise<Result<void>> {
    return ok(undefined);
  }

  /** Returns all recorded push results (for testing). */
  pushLog(): readonly BiPushResult[] {
    return this._pushLog;
  }
}

/** Registry that maps connector IDs to BiConnector instances. */
export class BiConnectorRegistry {
  private readonly _connectors: Map<string, BiConnector> = new Map();

  register(id: string, connector: BiConnector): void {
    this._connectors.set(id, connector);
  }

  get(id: string): Result<BiConnector> {
    const connector = this._connectors.get(id);
    if (!connector) {
      return err(new DestinationUnreachableError(id));
    }
    return ok(connector);
  }

  list(): readonly string[] {
    return [...this._connectors.keys()];
  }
}
