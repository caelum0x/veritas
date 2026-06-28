// Dynamic in-memory blocklist for IPs, user-agents, and user IDs.

import type { UserId } from "@veritas/core";

export type BlocklistKind = "ip" | "userAgent" | "userId";

export interface BlocklistEntry {
  readonly kind: BlocklistKind;
  readonly value: string;
  readonly reason: string;
  readonly addedAt: number;
  readonly expiresAt?: number;
}

interface MutableBlocklist {
  readonly ip: Map<string, BlocklistEntry>;
  readonly userAgent: Map<string, BlocklistEntry>;
  readonly userId: Map<string, BlocklistEntry>;
}

function makeStore(): MutableBlocklist {
  return { ip: new Map(), userAgent: new Map(), userId: new Map() };
}

export interface Blocklist {
  add(entry: BlocklistEntry): void;
  remove(kind: BlocklistKind, value: string): boolean;
  isBlocked(kind: BlocklistKind, value: string): boolean;
  getEntry(kind: BlocklistKind, value: string): BlocklistEntry | undefined;
  prune(): number;
  snapshot(): readonly BlocklistEntry[];
}

export function createBlocklist(): Blocklist {
  const store = makeStore();

  function mapFor(kind: BlocklistKind): Map<string, BlocklistEntry> {
    return store[kind];
  }

  function isExpired(entry: BlocklistEntry): boolean {
    return entry.expiresAt !== undefined && Date.now() > entry.expiresAt;
  }

  return {
    add(entry: BlocklistEntry): void {
      mapFor(entry.kind).set(entry.value.toLowerCase(), entry);
    },

    remove(kind: BlocklistKind, value: string): boolean {
      return mapFor(kind).delete(value.toLowerCase());
    },

    isBlocked(kind: BlocklistKind, value: string): boolean {
      const entry = mapFor(kind).get(value.toLowerCase());
      if (!entry) return false;
      if (isExpired(entry)) {
        mapFor(kind).delete(value.toLowerCase());
        return false;
      }
      return true;
    },

    getEntry(kind: BlocklistKind, value: string): BlocklistEntry | undefined {
      const entry = mapFor(kind).get(value.toLowerCase());
      if (!entry || isExpired(entry)) return undefined;
      return entry;
    },

    prune(): number {
      let removed = 0;
      for (const map of Object.values(store)) {
        for (const [key, entry] of map.entries()) {
          if (isExpired(entry)) {
            map.delete(key);
            removed++;
          }
        }
      }
      return removed;
    },

    snapshot(): readonly BlocklistEntry[] {
      const live: BlocklistEntry[] = [];
      for (const map of Object.values(store)) {
        for (const entry of map.values()) {
          if (!isExpired(entry)) live.push(entry);
        }
      }
      return Object.freeze(live);
    },
  };
}

export function blockIp(
  bl: Blocklist,
  ip: string,
  reason: string,
  ttlMs?: number
): void {
  bl.add({
    kind: "ip",
    value: ip,
    reason,
    addedAt: Date.now(),
    expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : undefined,
  });
}

export function blockUserId(
  bl: Blocklist,
  userId: UserId,
  reason: string,
  ttlMs?: number
): void {
  bl.add({
    kind: "userId",
    value: userId,
    reason,
    addedAt: Date.now(),
    expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : undefined,
  });
}

export function blockUserAgent(
  bl: Blocklist,
  userAgent: string,
  reason: string,
  ttlMs?: number
): void {
  bl.add({
    kind: "userAgent",
    value: userAgent,
    reason,
    addedAt: Date.now(),
    expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : undefined,
  });
}
