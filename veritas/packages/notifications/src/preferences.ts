// Per-recipient channel preference store for the notifications package.

import type { ChannelPreference } from "./types.js";

/** In-memory store for per-recipient channel preferences. */
export class PreferenceStore {
  private readonly store: Map<string, ChannelPreference[]> = new Map();

  /**
   * Upsert a channel preference for a recipient.
   * Returns a new store state — callers should use the mutating set method
   * on the instance; internal state is replaced immutably.
   */
  set(pref: ChannelPreference): void {
    const existing = this.store.get(pref.recipientId) ?? [];
    const updated = existing.filter((p) => p.channelId !== pref.channelId);
    this.store.set(pref.recipientId, [...updated, { ...pref }]);
  }

  /** Retrieve all preferences for a recipient. */
  getAll(recipientId: string): ReadonlyArray<ChannelPreference> {
    return this.store.get(recipientId) ?? [];
  }

  /**
   * Retrieve the preference for a specific recipient + channel combination.
   * Returns undefined if no preference is configured.
   */
  get(recipientId: string, channelId: string): ChannelPreference | undefined {
    const prefs = this.store.get(recipientId);
    return prefs?.find((p) => p.channelId === channelId);
  }

  /**
   * Returns the delivery address for a recipient on a given channel, or
   * undefined when the channel is disabled or has no configured address.
   */
  addressFor(recipientId: string, channelId: string): string | undefined {
    const pref = this.get(recipientId, channelId);
    if (!pref || !pref.enabled) return undefined;
    return pref.address || undefined;
  }

  /** Remove a single channel preference for a recipient. */
  remove(recipientId: string, channelId: string): void {
    const existing = this.store.get(recipientId);
    if (!existing) return;
    const updated = existing.filter((p) => p.channelId !== channelId);
    if (updated.length === 0) {
      this.store.delete(recipientId);
    } else {
      this.store.set(recipientId, updated);
    }
  }

  /** Remove all preferences for a recipient. */
  removeAll(recipientId: string): void {
    this.store.delete(recipientId);
  }

  /** List all recipient IDs that have at least one preference. */
  recipientIds(): string[] {
    return Array.from(this.store.keys());
  }
}
