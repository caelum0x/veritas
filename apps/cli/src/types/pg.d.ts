// Minimal ambient declaration for the `pg` module used in migration commands.
// This avoids the need for @types/pg while keeping the dynamic import typed.

declare module "pg" {
  export interface PoolConfig {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  }

  export interface QueryResult<R = Record<string, unknown>> {
    rows: R[];
    rowCount: number | null;
    command: string;
    oid: number;
    fields: Array<{ name: string; dataTypeID: number }>;
  }

  export interface PoolClient {
    query(sql: string, values?: unknown[]): Promise<QueryResult>;
    release(err?: boolean | Error): void;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query(sql: string, values?: unknown[]): Promise<QueryResult>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
    on(event: "error", listener: (err: Error, client: PoolClient) => void): this;
  }

  export class Client {
    constructor(config?: PoolConfig);
    connect(): Promise<void>;
    query(sql: string, values?: unknown[]): Promise<QueryResult>;
    end(): Promise<void>;
  }

  const pg: {
    Pool: typeof Pool;
    Client: typeof Client;
  };
  export default pg;
}
