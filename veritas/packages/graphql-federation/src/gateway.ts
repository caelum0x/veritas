// Federation gateway: validates supergraph config and routes requests to subgraphs.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import type { SupergraphConfig, QueryPlanNode } from "./types.js";
import { GatewayConfigError } from "./errors.js";

const GatewayConfigSchema = z.object({
  supergraphSdl: z.string().min(1),
  serviceList: z
    .array(z.object({ name: z.string().min(1), url: z.string().url() }))
    .optional(),
  introspection: z.boolean().default(false),
  debug: z.boolean().default(false),
  pollIntervalMs: z.number().int().positive().optional(),
});
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;

export interface GatewayInstance {
  readonly config: GatewayConfig;
  readonly supergraph: SupergraphConfig;
  readonly status: "running" | "stopped" | "error";
}

export interface GatewayRequest {
  readonly query: string;
  readonly variables?: Record<string, unknown>;
  readonly operationName?: string;
  readonly extensions?: Record<string, unknown>;
}

export interface GatewayResponse {
  readonly data: Record<string, unknown> | null;
  readonly errors?: ReadonlyArray<{ readonly message: string; readonly path?: ReadonlyArray<string> }>;
  readonly extensions?: Record<string, unknown>;
}

export interface SubgraphFetchResult {
  readonly subgraphName: string;
  readonly data: Record<string, unknown> | null;
  readonly errors?: ReadonlyArray<{ readonly message: string }>;
  readonly durationMs: number;
}

function parseSupergraphSdl(sdl: string): Result<SupergraphConfig, GatewayConfigError> {
  // Extract metadata from SDL comment header (format: # name:version:composedAt)
  const headerMatch = /^#\s*veritas-supergraph:\s*(\S+):(\S+):(\S+)/m.exec(sdl);
  if (!headerMatch) {
    return ok({
      name: "supergraph",
      subgraphNames: [],
      sdl,
      version: "1.0",
      composedAt: new Date().toISOString(),
    });
  }
  const [, name, version, composedAt] = headerMatch;
  const subgraphMatches = [...sdl.matchAll(/^#\s*subgraph:\s*(\S+)/gm)];
  const subgraphNames: ReadonlyArray<string> = subgraphMatches.map((m) => m[1]).filter((s): s is string => s !== undefined);
  return ok(
    Object.freeze({ name: name ?? "supergraph", subgraphNames, sdl, version: version ?? "1.0", composedAt: composedAt ?? new Date().toISOString() })
  );
}

export function createGateway(
  rawConfig: unknown
): Result<GatewayInstance, GatewayConfigError> {
  const parsed = GatewayConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    return err(
      new GatewayConfigError(
        `Invalid gateway config: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      )
    );
  }
  const config = parsed.data;
  const supergraphResult = parseSupergraphSdl(config.supergraphSdl);
  if (!supergraphResult.ok) return supergraphResult;
  const instance: GatewayInstance = Object.freeze({
    config,
    supergraph: supergraphResult.value,
    status: "running",
  });
  return ok(instance);
}

export function routeRequest(
  gateway: GatewayInstance,
  request: GatewayRequest,
  plan: QueryPlanNode
): Result<GatewayResponse, GatewayConfigError> {
  if (gateway.status !== "running") {
    return err(new GatewayConfigError("Gateway is not running"));
  }
  if (!request.query || request.query.trim().length === 0) {
    return err(new GatewayConfigError("Query must not be empty"));
  }
  // In a real gateway this would execute the plan; here we emit a descriptor.
  const response: GatewayResponse = Object.freeze({
    data: Object.freeze({
      _gateway: Object.freeze({
        status: gateway.status,
        supergraph: gateway.supergraph.name,
        operationName: request.operationName ?? null,
        planKind: plan.kind,
      }),
    }),
    extensions: Object.freeze({
      gateway: Object.freeze({ version: gateway.supergraph.version }),
    }),
  });
  return ok(response);
}

export function stopGateway(gateway: GatewayInstance): GatewayInstance {
  return Object.freeze({ ...gateway, status: "stopped" });
}

export function gatewaySubgraphUrls(
  gateway: GatewayInstance
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const svc of gateway.config.serviceList ?? []) {
    map.set(svc.name, svc.url);
  }
  return map;
}
