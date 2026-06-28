// BaseConnectorPlus: shared fetch helper and config parsing used by all connectors-plus providers.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import type { Connector, ConnectorMeta } from "@veritas/connectors";
import { ConnectorConfigError, ConnectorSendError } from "@veritas/connectors";
import type { OutboundPayload } from "@veritas/connectors";

export { ConnectorConfigError, ConnectorSendError };

/** Minimal base config reused by all providers in this package. */
export const BasePlusConfigSchema = z.object({
  timeoutMs: z.number().int().positive().default(10_000),
  maxRetries: z.number().int().min(0).max(5).default(2),
});

export type BasePlusConfig = z.infer<typeof BasePlusConfigSchema>;

/** Parsed HTTP response envelope returned by doFetch. */
export interface FetchResult {
  readonly status: number;
  readonly body: string;
}

/** Perform a single HTTP POST with timeout; returns FetchResult or ConnectorSendError. */
export async function doPost(
  connectorId: string,
  url: string,
  headers: Record<string, string>,
  jsonBody: unknown,
  timeoutMs: number,
): Promise<Result<FetchResult>> {
  let response: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(jsonBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    return err(
      new ConnectorSendError(
        connectorId,
        `HTTP request failed: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  }

  const body = await response.text().catch(() => "");
  return ok({ status: response.status, body });
}

/** Assert a FetchResult has a 2xx status; otherwise return a ConnectorSendError. */
export function assertOk(
  connectorId: string,
  result: FetchResult,
  context: string,
): Result<void> {
  if (result.status >= 200 && result.status < 300) {
    return ok(undefined);
  }
  return err(
    new ConnectorSendError(
      connectorId,
      `${context} returned HTTP ${result.status}: ${result.body}`,
    ),
  );
}

/** Abstract base class connectors-plus providers extend. */
export abstract class AbstractConnector implements Connector {
  abstract readonly meta: ConnectorMeta;
  abstract send(payload: OutboundPayload): Promise<Result<void>>;
}
