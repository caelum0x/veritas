// Shared type definitions for the extensions module.

export type ExtensionId = string;
export type HookName = string;

export interface ExtensionMeta {
  readonly id: ExtensionId;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
}

export type SyncHandler<T> = (value: T) => T;
export type AsyncHandler<T> = (value: T) => Promise<T>;
export type Handler<T> = SyncHandler<T> | AsyncHandler<T>;

export type FilterFn<T> = (value: T) => boolean | Promise<boolean>;
export type ActionFn<T> = (value: T) => void | Promise<void>;

export interface HookEntry<T> {
  readonly handler: Handler<T>;
  readonly priority: number;
  readonly extensionId: ExtensionId;
}

export interface FilterEntry<T> {
  readonly filter: FilterFn<T>;
  readonly priority: number;
  readonly extensionId: ExtensionId;
}

export interface ActionEntry<T> {
  readonly action: ActionFn<T>;
  readonly priority: number;
  readonly extensionId: ExtensionId;
}

/** Prioritized marker for use with sortByPriority. */
export interface Prioritized {
  readonly priority?: number;
}
