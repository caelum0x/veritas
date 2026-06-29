// DataLoader for batching ApiKey lookups by ID
import type { ApiKey } from "@veritas/contracts";
import type { GqlContext } from "../context.js";
import { createLoader } from "../dataloader.js";

export function createApiKeyLoader(ctx: GqlContext) {
  return createLoader<string, ApiKey>(async (ids) => {
    const results = await Promise.all(
      ids.map((id) => ctx.services.apiKey.findById(id))
    );
    return results.map((r, i) =>
      r && r.id === ids[i] ? r : new Error(`ApiKey not found: ${ids[i]}`)
    );
  });
}

export type ApiKeyLoader = ReturnType<typeof createApiKeyLoader>;
