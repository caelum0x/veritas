// Collects API call events into an in-memory buffer for later aggregation
import { newId, epochToIso } from "@veritas/core";
import { type ApiCallEvent, type HttpMethod } from "./event.js";

export interface CollectOptions {
  readonly method: HttpMethod;
  readonly endpoint: string;
  readonly statusCode: number;
  readonly latencyMs: number;
  readonly consumerId: string;
  readonly apiKeyId: string;
  readonly requestSizeBytes: number;
  readonly responseSizeBytes: number;
  readonly errorCode?: string;
}

export interface Collector {
  collect(opts: CollectOptions): void;
  flush(): readonly ApiCallEvent[];
  size(): number;
}

export function createCollector(maxBufferSize = 10_000): Collector {
  let buffer: ApiCallEvent[] = [];

  return {
    collect(opts: CollectOptions): void {
      if (buffer.length >= maxBufferSize) {
        buffer = buffer.slice(Math.floor(maxBufferSize / 2));
      }
      const event: ApiCallEvent = {
        eventId: newId("evt"),
        timestamp: epochToIso(Date.now()),
        method: opts.method,
        endpoint: opts.endpoint,
        statusCode: opts.statusCode,
        latencyMs: opts.latencyMs,
        consumerId: opts.consumerId,
        apiKeyId: opts.apiKeyId,
        requestSizeBytes: opts.requestSizeBytes,
        responseSizeBytes: opts.responseSizeBytes,
        ...(opts.errorCode !== undefined ? { errorCode: opts.errorCode } : {}),
      };
      buffer = [...buffer, event];
    },

    flush(): readonly ApiCallEvent[] {
      const events = buffer;
      buffer = [];
      return events;
    },

    size(): number {
      return buffer.length;
    },
  };
}
