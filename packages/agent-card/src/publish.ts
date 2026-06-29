// Publish an AgentCard to a registry — HTTP POST with retry and typed error handling.

import { ok, err, type Result, withRetry, DEFAULT_RETRY } from "@veritas/core";
import { type BuilderAgentCard } from "./builder.js";
import { CardPublishError, CardRegistryUnavailableError } from "./errors.js";
import { type PublishTarget, type RegistryKind } from "./types.js";

/** Result of a successful publish operation. */
export interface PublishReceipt {
  readonly agentId: string;
  readonly registryUrl: string;
  readonly kind: RegistryKind;
  readonly publishedAt: string;
  /** URL where the card can be retrieved, if returned by the registry. */
  readonly cardUrl?: string;
}

/** Port interface for the HTTP transport — allows mocking in tests. */
export interface CardRegistryPort {
  post(url: string, payload: unknown, authToken?: string): Promise<{ status: number; body: unknown }>;
}

/** Fetch-based implementation of `CardRegistryPort`. */
export const fetchCardRegistry: CardRegistryPort = {
  async post(url, payload, authToken) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    return { status: response.status, body };
  },
};

/** Publish `card` to the given `target`, returning a receipt on success. */
export async function publishCard(
  card: BuilderAgentCard,
  target: PublishTarget,
  registry: CardRegistryPort = fetchCardRegistry,
): Promise<Result<PublishReceipt, CardPublishError | CardRegistryUnavailableError>> {
  const endpoint = `${target.registryUrl.replace(/\/$/, "")}/agents`;

  let response: { status: number; body: unknown };

  try {
    // withRetry throws on network failure — we map that to a typed error afterward.
    response = await withRetry(
      async () => {
        const res = await registry.post(endpoint, card, target.authToken);
        // Treat server-side unavailability as a thrown error so withRetry retries it.
        if (res.status === 503 || res.status === 504) {
          throw new CardRegistryUnavailableError(target.registryUrl);
        }
        return res;
      },
      {
        ...DEFAULT_RETRY,
        attempts: 3,
        shouldRetry: (e, _attempt) => e instanceof CardRegistryUnavailableError,
      },
    );
  } catch (cause) {
    if (cause instanceof CardRegistryUnavailableError) {
      return err(cause);
    }
    return err(new CardRegistryUnavailableError(target.registryUrl, cause));
  }

  if (response.status >= 400) {
    const detail =
      isObject(response.body) && typeof (response.body as Record<string, unknown>)["message"] === "string"
        ? ((response.body as Record<string, unknown>)["message"] as string)
        : `HTTP ${response.status}`;
    return err(new CardPublishError(`Registry rejected card: ${detail}`));
  }

  const cardUrl =
    isObject(response.body) && typeof (response.body as Record<string, unknown>)["cardUrl"] === "string"
      ? ((response.body as Record<string, unknown>)["cardUrl"] as string)
      : undefined;

  return ok({
    agentId: card.id,
    registryUrl: target.registryUrl,
    kind: target.kind,
    publishedAt: new Date().toISOString(),
    cardUrl,
  });
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
