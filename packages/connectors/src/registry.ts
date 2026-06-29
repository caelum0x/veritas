// ConnectorRegistry: thread-safe in-memory store of active Connector instances.
import { ConflictError, NotFoundError, ok, err, type Result } from "@veritas/core";
import type { Connector, ConnectorId } from "./connector.js";

export class ConnectorRegistry {
  private readonly store = new Map<ConnectorId, Connector>();

  register(connector: Connector): Result<void> {
    if (this.store.has(connector.meta.id)) {
      return err(new ConflictError({ message: `Connector "${connector.meta.id}" is already registered` }));
    }
    this.store.set(connector.meta.id, connector);
    return ok(undefined);
  }

  async unregister(id: ConnectorId): Promise<Result<void>> {
    const connector = this.store.get(id);
    if (!connector) {
      return err(new NotFoundError({ message: `Connector "${id}" not found` }));
    }
    if (connector.destroy) {
      await connector.destroy();
    }
    this.store.delete(id);
    return ok(undefined);
  }

  get(id: ConnectorId): Result<Connector> {
    const connector = this.store.get(id);
    if (!connector) {
      return err(new NotFoundError({ message: `Connector "${id}" not found` }));
    }
    return ok(connector);
  }

  list(): readonly Connector[] {
    return Array.from(this.store.values());
  }

  has(id: ConnectorId): boolean {
    return this.store.has(id);
  }
}
