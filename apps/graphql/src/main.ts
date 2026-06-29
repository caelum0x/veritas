// GraphQL server entrypoint: loads config, builds schema, wires context, starts HTTP server
import { createLogger } from "@veritas/observability";
import { loadConfig } from "@veritas/config";
import type { AppConfig } from "@veritas/config";
import { systemClock, epochToIso } from "@veritas/core";
import { makeServiceContext } from "@veritas/services";
import type { Logger } from "@veritas/observability";
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { buildAppSchema } from "./schema.js";
import { createGraphQLServer } from "./server.js";
import type { GqlContext, Loaders, GqlServices } from "./context.js";
import { DataLoader } from "./dataloader.js";

/** Stub services for types not yet fully wired — replaced by real implementations per deploy. */
function buildStubServices(): GqlServices {
  const notImplemented = (): never => {
    throw new Error("Service not implemented in stub context");
  };
  return {
    apiKey: {
      findById: notImplemented,
      findByOrganization: notImplemented,
      create: notImplemented,
      revoke: notImplemented,
    },
    billing: {
      getInvoice: notImplemented,
      listInvoices: notImplemented,
      createInvoice: notImplemented,
      updateInvoice: notImplemented,
      voidInvoice: notImplemented,
      getInvoicesByIds: notImplemented,
      getPlan: notImplemented,
      listPlans: notImplemented,
      createPlan: notImplemented,
      updatePlan: notImplemented,
      archivePlan: notImplemented,
      getPlansByIds: notImplemented,
    },
    wallet: {
      findById: notImplemented,
      findByOrganization: notImplemented,
      create: notImplemented,
    },
    verificationJob: {
      list: notImplemented,
      submit: notImplemented,
      cancel: notImplemented,
    },
  };
}

/** Stub loaders for types not yet fully wired — replaced by real batch fns per deploy. */
function buildStubLoaders(): Loaders {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub = new DataLoader<string, any>(async (keys) => keys.map(() => null));
  return {
    claim: stub,
    citation: stub,
    verdict: stub,
    report: stub,
    provenance: stub,
    job: stub,
    order: stub,
    negotiation: stub,
    delivery: stub,
    agent: stub,
    service: stub,
    apiKey: stub,
    wallet: stub,
    usage: stub,
    invoice: stub,
    plan: stub,
    subscription: stub,
    webhook: stub,
    auditLog: stub,
    user: stub,
    organization: stub,
    session: stub,
    settlement: stub,
    transaction: stub,
    tenant: stub,
  } as unknown as Loaders;
}

function buildContextFactory(
  logger: Logger,
  _config: AppConfig,
): (req: IncomingMessage) => Promise<GqlContext> {
  return async (_req: IncomingMessage): Promise<GqlContext> => {
    const requestId = randomUUID();
    const now = epochToIso(systemClock.now());
    const serviceCtx = makeServiceContext(
      { userId: "system", orgId: undefined, roles: ["anonymous"], apiKeyId: undefined },
      requestId,
      requestId,
      now,
    );
    return {
      principal: undefined,
      serviceCtx,
      services: buildStubServices(),
      loaders: buildStubLoaders(),
      logger: logger.child({ requestId }),
      requestId,
    };
  };
}

async function main(): Promise<void> {
  const logger = createLogger({
    level: process.env["LOG_LEVEL"] ?? "info",
    bindings: { service: "graphql" },
  });

  let config: ReturnType<typeof loadConfig>;
  try {
    config = loadConfig();
  } catch (err: unknown) {
    logger.error("Configuration failed", { error: String(err) });
    process.exit(1);
  }

  const schema = buildAppSchema();
  const context = buildContextFactory(logger, config);
  const port = Number(process.env["GRAPHQL_PORT"] ?? config.server.port ?? 4000);

  const server = createGraphQLServer({ schema, context, logger, port, path: "/graphql" });

  const shutdown = (): void => {
    logger.info("Shutdown signal received");
    server.stop().then(() => process.exit(0)).catch(() => process.exit(1));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await server.start();
}

main().catch((err: unknown) => {
  console.error("Fatal startup error", err);
  process.exit(1);
});
