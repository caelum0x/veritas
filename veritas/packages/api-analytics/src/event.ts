// Defines the ApiCallEvent type representing a single recorded API call
import { type IsoTimestamp } from "@veritas/core";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface ApiCallEvent {
  readonly eventId: string;
  readonly timestamp: IsoTimestamp;
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
