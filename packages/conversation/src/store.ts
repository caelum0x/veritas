// In-memory conversation store: CRUD for Conversation records
import { ok, err, type Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { Conversation } from "./conversation.js";
import { ConversationNotFoundError } from "./errors.js";

/** Port interface for persisting conversations */
export interface ConversationStore {
  load(id: string): Promise<Conversation | null>;
  list(userId?: string): Promise<ReadonlyArray<Conversation>>;
  save(conversation: Conversation): Promise<Conversation>;
  delete(id: string): Promise<Result<void, AppError>>;
}

/** In-memory implementation of ConversationStore (no external deps) */
export class InMemoryConversationStore implements ConversationStore {
  private readonly _store = new Map<string, Conversation>();

  async load(id: string): Promise<Conversation | null> {
    return this._store.get(id) ?? null;
  }

  async list(userId?: string): Promise<ReadonlyArray<Conversation>> {
    const all = Array.from(this._store.values());
    if (userId !== undefined) {
      return Object.freeze(
        all.filter(
          (c) =>
            (c.meta as Record<string, unknown> | undefined)?.["userId"] === userId,
        ),
      );
    }
    return Object.freeze(all);
  }

  async save(conversation: Conversation): Promise<Conversation> {
    this._store.set(conversation.id, conversation);
    return conversation;
  }

  async delete(id: string): Promise<Result<void, AppError>> {
    if (!this._store.has(id)) {
      return err(new ConversationNotFoundError(id));
    }
    this._store.delete(id);
    return ok(undefined as void);
  }

  /** Return current store size (useful for testing) */
  get size(): number {
    return this._store.size;
  }
}
