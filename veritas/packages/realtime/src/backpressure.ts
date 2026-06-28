// Backpressure buffer: absorbs bursts and applies drop policy when the buffer is full.

import type { BackpressureOptions, RealtimeMessage } from "./types.js";

export interface BackpressureBuffer {
  push(message: RealtimeMessage): boolean;
  drain(): readonly RealtimeMessage[];
  size(): number;
  isFull(): boolean;
  clear(): void;
}

export type DrainHandler = (messages: readonly RealtimeMessage[]) => void;

export class InMemoryBackpressureBuffer implements BackpressureBuffer {
  private readonly options: BackpressureOptions;
  private buffer: RealtimeMessage[] = [];
  private drainHandlers: DrainHandler[] = [];
  private drainTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: BackpressureOptions) {
    this.options = options;
  }

  push(message: RealtimeMessage): boolean {
    if (this.buffer.length < this.options.maxBufferSize) {
      this.buffer = [...this.buffer, message];
      return true;
    }

    switch (this.options.dropPolicy) {
      case "drop-oldest": {
        this.buffer = [...this.buffer.slice(1), message];
        return true;
      }
      case "drop-newest": {
        return false;
      }
      case "error": {
        throw new Error(
          `Backpressure buffer full (max=${this.options.maxBufferSize})`
        );
      }
    }
  }

  drain(): readonly RealtimeMessage[] {
    const drained = this.buffer;
    this.buffer = [];
    return drained;
  }

  size(): number {
    return this.buffer.length;
  }

  isFull(): boolean {
    return this.buffer.length >= this.options.maxBufferSize;
  }

  clear(): void {
    this.buffer = [];
  }

  startAutoDrain(intervalMs: number): void {
    if (this.drainTimer !== null) return;
    this.drainTimer = setInterval(() => {
      if (this.buffer.length === 0) return;
      const messages = this.drain();
      for (const handler of this.drainHandlers) {
        handler(messages);
      }
    }, intervalMs);
  }

  stopAutoDrain(): void {
    if (this.drainTimer !== null) {
      clearInterval(this.drainTimer);
      this.drainTimer = null;
    }
  }

  onDrain(handler: DrainHandler): () => void {
    this.drainHandlers = [...this.drainHandlers, handler];
    return () => {
      this.drainHandlers = this.drainHandlers.filter((h) => h !== handler);
    };
  }
}

export function createBackpressureBuffer(
  options: BackpressureOptions
): InMemoryBackpressureBuffer {
  return new InMemoryBackpressureBuffer(options);
}

export const DEFAULT_BACKPRESSURE_OPTIONS: BackpressureOptions = {
  maxBufferSize: 1000,
  dropPolicy: "drop-oldest",
};
