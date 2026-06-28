// Extension point registry: defines named hook slots that plugins attach to.
import { ExtensionNotFoundError, ExtensionConflictError } from "./errors.js";
import type { HookName, ExtensionId } from "./types.js";

export interface ExtensionPoint<T = unknown> {
  readonly name: HookName;
  readonly description?: string;
  readonly defaultValue?: T;
}

/** Internal record for a registered extension point. */
interface PointRecord<T> {
  readonly point: ExtensionPoint<T>;
  readonly registeredBy: ExtensionId;
}

/** Registry of named extension points. Immutable after registration. */
export class ExtensionPointRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly #points = new Map<HookName, PointRecord<any>>();

  /** Register a new extension point. Throws if name already taken. */
  register<T>(point: ExtensionPoint<T>, registeredBy: ExtensionId): void {
    if (this.#points.has(point.name)) {
      throw new ExtensionConflictError(point.name);
    }
    this.#points.set(point.name, { point, registeredBy });
  }

  /** Retrieve a registered extension point by name. */
  get<T>(name: HookName): ExtensionPoint<T> {
    const record = this.#points.get(name) as PointRecord<T> | undefined;
    if (!record) {
      throw new ExtensionNotFoundError(name);
    }
    return record.point;
  }

  /** Check whether an extension point with the given name exists. */
  has(name: HookName): boolean {
    return this.#points.has(name);
  }

  /** All registered extension point names. */
  names(): ReadonlyArray<HookName> {
    return [...this.#points.keys()];
  }

  /** Unregister an extension point — only allowed by the original registrant. */
  unregister(name: HookName, requestedBy: ExtensionId): void {
    const record = this.#points.get(name);
    if (!record) {
      throw new ExtensionNotFoundError(name);
    }
    if (record.registeredBy !== requestedBy) {
      throw new ExtensionConflictError(
        `${name} is owned by ${record.registeredBy}, not ${requestedBy}`,
      );
    }
    this.#points.delete(name);
  }
}
