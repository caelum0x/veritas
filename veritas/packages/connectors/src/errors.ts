// Connector-specific error types extending AppError for integration failures.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class ConnectorError extends AppError {
  readonly connectorId: string;

  constructor(connectorId: string, message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, message, options);
    this.connectorId = connectorId;
    this.name = "ConnectorError";
  }
}

export class ConnectorSendError extends ConnectorError {
  constructor(connectorId: string, message: string, options?: AppErrorOptions) {
    super(connectorId, message, options);
    this.name = "ConnectorSendError";
  }
}

export class ConnectorConfigError extends ConnectorError {
  constructor(connectorId: string, message: string, options?: AppErrorOptions) {
    super(connectorId, message, options);
    this.name = "ConnectorConfigError";
  }
}

export class ConnectorTimeoutError extends ConnectorError {
  constructor(connectorId: string, message: string, options?: AppErrorOptions) {
    super(connectorId, message, options);
    this.name = "ConnectorTimeoutError";
  }
}
