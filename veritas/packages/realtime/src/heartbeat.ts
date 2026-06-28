// Heartbeat: sends periodic pings and fires a timeout callback on missed responses.
import type { HeartbeatOptions } from "./types.js";
import { HeartbeatTimeoutError } from "./errors.js";

export interface HeartbeatHandle {
  readonly subscriberId: string;
  readonly stop: () => void;
  readonly pong: () => void;
}

export type HeartbeatPingFn = (subscriberId: string) => void;
export type HeartbeatTimeoutFn = (subscriberId: string, error: HeartbeatTimeoutError) => void;

export function startHeartbeat(
  subscriberId: string,
  options: HeartbeatOptions,
  onPing: HeartbeatPingFn,
  onTimeout: HeartbeatTimeoutFn,
): HeartbeatHandle {
  const { intervalMs, timeoutMs } = options;
  let stopped = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let intervalHandle: ReturnType<typeof setInterval> | null = null;

  const clearPendingTimeout = (): void => {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  };

  const ping = (): void => {
    if (stopped) return;
    onPing(subscriberId);
    timeoutHandle = setTimeout(() => {
      if (!stopped) {
        stop();
        onTimeout(subscriberId, new HeartbeatTimeoutError(subscriberId));
      }
    }, timeoutMs);
  };

  const stop = (): void => {
    stopped = true;
    clearPendingTimeout();
    if (intervalHandle !== null) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
  };

  const pong = (): void => {
    if (!stopped) {
      clearPendingTimeout();
    }
  };

  intervalHandle = setInterval(ping, intervalMs);

  return { subscriberId, stop, pong };
}

export interface HeartbeatManager {
  readonly register: (subscriberId: string, onPing: HeartbeatPingFn, onTimeout: HeartbeatTimeoutFn) => void;
  readonly pong: (subscriberId: string) => void;
  readonly deregister: (subscriberId: string) => void;
  readonly stopAll: () => void;
}

export function createHeartbeatManager(options: HeartbeatOptions): HeartbeatManager {
  const handles = new Map<string, HeartbeatHandle>();

  return {
    register(subscriberId: string, onPing: HeartbeatPingFn, onTimeout: HeartbeatTimeoutFn): void {
      if (handles.has(subscriberId)) return;
      const handle = startHeartbeat(subscriberId, options, onPing, onTimeout);
      handles.set(subscriberId, handle);
    },

    pong(subscriberId: string): void {
      handles.get(subscriberId)?.pong();
    },

    deregister(subscriberId: string): void {
      const handle = handles.get(subscriberId);
      if (handle) {
        handle.stop();
        handles.delete(subscriberId);
      }
    },

    stopAll(): void {
      for (const handle of handles.values()) {
        handle.stop();
      }
      handles.clear();
    },
  };
}
