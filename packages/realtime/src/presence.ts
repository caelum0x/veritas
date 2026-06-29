// Presence tracking: records who is online in each channel with join/leave events.

import type { PresenceInfo } from "./types.js";

export interface PresenceEvent {
  readonly type: "join" | "leave" | "update";
  readonly presence: PresenceInfo;
}

export type PresenceHandler = (event: PresenceEvent) => void;

export interface PresenceTracker {
  join(info: PresenceInfo): void;
  leave(subscriberId: string, channelId: string): void;
  update(subscriberId: string, channelId: string, meta: Record<string, unknown>): void;
  getChannel(channelId: string): readonly PresenceInfo[];
  getSubscriber(subscriberId: string): readonly PresenceInfo[];
  onPresenceChange(channelId: string, handler: PresenceHandler): () => void;
  channelCount(channelId: string): number;
}

export class InMemoryPresenceTracker implements PresenceTracker {
  private presenceMap: Map<string, Map<string, PresenceInfo>> = new Map();
  private handlers: Map<string, Set<PresenceHandler>> = new Map();

  join(info: PresenceInfo): void {
    const channelMap = this.getOrCreateChannelMap(info.channelId);
    const updated = new Map(channelMap);
    updated.set(info.subscriberId, info);
    this.presenceMap.set(info.channelId, updated);
    this.emit(info.channelId, { type: "join", presence: info });
  }

  leave(subscriberId: string, channelId: string): void {
    const channelMap = this.presenceMap.get(channelId);
    if (channelMap === undefined) return;

    const existing = channelMap.get(subscriberId);
    if (existing === undefined) return;

    const updated = new Map(channelMap);
    updated.delete(subscriberId);
    this.presenceMap.set(channelId, updated);
    this.emit(channelId, { type: "leave", presence: existing });
  }

  update(
    subscriberId: string,
    channelId: string,
    meta: Record<string, unknown>
  ): void {
    const channelMap = this.presenceMap.get(channelId);
    if (channelMap === undefined) return;

    const existing = channelMap.get(subscriberId);
    if (existing === undefined) return;

    const updatedInfo: PresenceInfo = { ...existing, meta: { ...meta } };
    const updatedMap = new Map(channelMap);
    updatedMap.set(subscriberId, updatedInfo);
    this.presenceMap.set(channelId, updatedMap);
    this.emit(channelId, { type: "update", presence: updatedInfo });
  }

  getChannel(channelId: string): readonly PresenceInfo[] {
    const channelMap = this.presenceMap.get(channelId);
    if (channelMap === undefined) return [];
    return Array.from(channelMap.values());
  }

  getSubscriber(subscriberId: string): readonly PresenceInfo[] {
    const result: PresenceInfo[] = [];
    for (const channelMap of this.presenceMap.values()) {
      const info = channelMap.get(subscriberId);
      if (info !== undefined) {
        result.push(info);
      }
    }
    return result;
  }

  onPresenceChange(channelId: string, handler: PresenceHandler): () => void {
    const set = this.getOrCreateHandlerSet(channelId);
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  channelCount(channelId: string): number {
    return this.presenceMap.get(channelId)?.size ?? 0;
  }

  private emit(channelId: string, event: PresenceEvent): void {
    const set = this.handlers.get(channelId);
    if (set === undefined) return;
    for (const handler of set) {
      handler(event);
    }
  }

  private getOrCreateChannelMap(channelId: string): Map<string, PresenceInfo> {
    const existing = this.presenceMap.get(channelId);
    if (existing !== undefined) return existing;
    const created = new Map<string, PresenceInfo>();
    this.presenceMap.set(channelId, created);
    return created;
  }

  private getOrCreateHandlerSet(channelId: string): Set<PresenceHandler> {
    const existing = this.handlers.get(channelId);
    if (existing !== undefined) return existing;
    const created = new Set<PresenceHandler>();
    this.handlers.set(channelId, created);
    return created;
  }
}

export function createPresenceTracker(): InMemoryPresenceTracker {
  return new InMemoryPresenceTracker();
}
