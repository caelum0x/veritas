// container.ts: wires all in-memory repositories, services, and infrastructure into a Deps bundle.
import type { AppConfig } from "@veritas/config";
import { systemClock } from "@veritas/core";
import { InMemoryEventBus } from "@veritas/core";
import type { Result } from "@veritas/core";
import { createLogger } from "@veritas/observability";
import type { Logger } from "@veritas/observability";
import {
  JobMemoryRepository,
  ReportMemoryRepository,
  UsageMemoryRepository,
  MemoryPlanRepository,
  ApiKeyMemoryRepository,
} from "@veritas/persistence";
import {
  VerificationJobService,
  ReportService,
  UsageMeteringService,
  PricingService,
  ApiKeyService,
} from "@veritas/services";
import type { RateLimiter, LimiterOptions, LimitDecision } from "@veritas/rate-limit";
import { createLimiterStore, allowedDecision, deniedDecision } from "@veritas/rate-limit";
import type { RateLimitError } from "@veritas/rate-limit";
import { defaultResponder } from "./http/responder.js";
import type { Responder } from "./http/responder.js";

/** Full dependency bundle injected into feature route modules. */
export interface Deps {
  readonly logger: Logger;
  readonly verificationJobService: VerificationJobService;
  readonly reportService: ReportService;
  readonly usageMeteringService: UsageMeteringService;
  readonly pricingService: PricingService;
  readonly apiKeyService: ApiKeyService;
  readonly rateLimiter: RateLimiter;
  readonly responder: Responder;
  readonly eventBus: InMemoryEventBus;
}

/** Minimal cache provider backed by an in-process Map for the rate-limit store. */
interface SimpleCache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

function createInMemoryCache(): SimpleCache {
  const store = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    async get(key: string): Promise<unknown> {
      const entry = store.get(key);
      if (entry === undefined) return undefined;
      if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
      const expiresAt = ttlMs !== undefined && ttlMs > 0 ? Date.now() + ttlMs : 0;
      store.set(key, { value, expiresAt });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

/** Create a sliding-window rate limiter backed by the in-process limiter store. */
function buildRateLimiter(opts: LimiterOptions): RateLimiter {
  const cache = createInMemoryCache();
  const limiterStore = createLimiterStore(cache, { keyPrefix: "rl:" });

  return {
    async check(key: string, now?: number): Promise<Result<LimitDecision, RateLimitError>> {
      const ts = now ?? Date.now();
      const timestamps = await limiterStore.appendLog(key, ts, opts.windowMs);
      const windowStart = ts - opts.windowMs;
      const within = timestamps.filter((t) => t >= windowStart);
      const resetAt = windowStart + opts.windowMs;
      if (within.length <= opts.max) {
        return { ok: true, value: allowedDecision(opts.max, opts.max - within.length, resetAt) };
      }
      return { ok: true, value: deniedDecision(opts.max, resetAt, ts) };
    },
    async reset(key: string): Promise<void> {
      await limiterStore.delete(key);
    },
  };
}

/** Instantiate all infrastructure and services; return an immutable Deps bundle. */
export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({
    level: config.observability?.logLevel ?? "info",
    bindings: { service: "public-api" },
  });

  const clock = systemClock;
  const eventBus = new InMemoryEventBus();

  // Repositories
  const jobRepository = new JobMemoryRepository();
  const reportRepository = new ReportMemoryRepository();
  const usageRepository = new UsageMemoryRepository();
  const planRepository = new MemoryPlanRepository();
  const apiKeyRepository = new ApiKeyMemoryRepository();

  // Domain services wired with real repositories
  const verificationJobService = new VerificationJobService({ jobRepository, logger });
  const reportService = new ReportService({ reportRepository, logger });
  const usageMeteringService = new UsageMeteringService({ usageRepository, logger, clock });
  const pricingService = new PricingService({ planRepo: planRepository, logger, clock });

  // ApiKeyMemoryRepository is structurally compatible with the service's internal ApiKeyRepo port
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiKeyService = new ApiKeyService({ apiKeyRepo: apiKeyRepository as any, logger });

  // Rate limiter: 100 requests per 60 s per key
  const rateLimiter = buildRateLimiter({ windowMs: 60_000, max: 100 });

  return Object.freeze({
    logger,
    verificationJobService,
    reportService,
    usageMeteringService,
    pricingService,
    apiKeyService,
    rateLimiter,
    responder: defaultResponder,
    eventBus,
  });
}
