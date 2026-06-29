// Builds the Deps object by wiring all package services, repos, and providers.
import { systemClock } from "@veritas/core";
import type { Clock } from "@veritas/core";
import { createLogger } from "@veritas/observability";
import type { Logger } from "@veritas/observability";
import { AlwaysHealthyCheck, runHealthChecks } from "@veritas/observability";
import type { HealthCheck, AggregateHealthReport } from "@veritas/observability";
import { UserMemoryRepository } from "@veritas/persistence";
import { OrganizationMemoryRepository } from "@veritas/persistence";
import { MembershipMemoryRepository } from "@veritas/persistence";
import { MemoryPlanRepository } from "@veritas/persistence";
import { MemoryAgentRepository } from "@veritas/persistence";
import { AuditLogMemoryRepository } from "@veritas/persistence";
import { UserService } from "@veritas/services";
import { OrganizationService } from "@veritas/services";
import { MembershipService } from "@veritas/services";
import { PlanService } from "@veritas/services";
import { AgentService } from "@veritas/services";
import { AuditLogService } from "@veritas/services";
import { InMemoryTenantStore } from "@veritas/tenancy";
import { InMemoryRoleStore } from "@veritas/rbac";
import { createApiKeyHasher } from "@veritas/auth";
import { BufferExporter } from "@veritas/audit-export";
import type { AppConfig } from "./config.js";

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly clock: Clock;

  // Repositories
  readonly userRepo: UserMemoryRepository;
  readonly orgRepo: OrganizationMemoryRepository;
  readonly membershipRepo: MembershipMemoryRepository;
  readonly planRepo: MemoryPlanRepository;
  readonly agentRepo: MemoryAgentRepository;
  readonly auditLogRepo: AuditLogMemoryRepository;

  // Tenancy
  readonly tenantStore: InMemoryTenantStore;

  // RBAC
  readonly roleStore: InMemoryRoleStore;

  // Auth
  readonly apiKeyHasher: ReturnType<typeof createApiKeyHasher>;

  // Domain Services
  readonly userService: UserService;
  readonly orgService: OrganizationService;
  readonly membershipService: MembershipService;
  readonly planService: PlanService;
  readonly agentService: AgentService;
  readonly auditLogService: AuditLogService;

  // Audit export
  readonly auditExporter: BufferExporter;

  // Health
  readonly healthChecks: readonly HealthCheck[];
  readonly runHealth: () => Promise<AggregateHealthReport>;
}

/** Instantiate all package integrations and return a fully-wired Deps object. */
export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({
    level: config.observability.logLevel,
    bindings: { service: "admin-api" },
  });

  const clock = systemClock;

  // Repositories
  const userRepo = new UserMemoryRepository();
  const orgRepo = new OrganizationMemoryRepository();
  const membershipRepo = new MembershipMemoryRepository();
  const planRepo = new MemoryPlanRepository();
  const agentRepo = new MemoryAgentRepository();
  const auditLogRepo = new AuditLogMemoryRepository();

  // Tenancy
  const tenantStore = new InMemoryTenantStore();

  // RBAC
  const roleStore = new InMemoryRoleStore();

  // Auth
  const apiKeyHasher = createApiKeyHasher();

  // Domain services — each receives repos + logger + clock
  const userService = new UserService({
    userRepo: userRepo as never,
    logger,
    clock,
  });

  const orgService = new OrganizationService({
    orgRepo: orgRepo as never,
    logger,
    clock,
  });

  const membershipService = new MembershipService({
    membershipRepo: membershipRepo as never,
    logger,
    clock,
  });

  const planService = new PlanService({
    planRepo,
    logger,
    clock,
  });

  const agentService = new AgentService({
    agentRepository: agentRepo,
    logger,
  });

  const auditLogService = new AuditLogService({ logger, clock });

  // Audit export
  const auditExporter = new BufferExporter();

  // Health checks
  const healthChecks: readonly HealthCheck[] = [
    new AlwaysHealthyCheck("memory-store"),
    new AlwaysHealthyCheck("tenant-store"),
  ];

  const runHealth = () => runHealthChecks(healthChecks);

  return Object.freeze({
    config,
    logger,
    clock,
    userRepo,
    orgRepo,
    membershipRepo,
    planRepo,
    agentRepo,
    auditLogRepo,
    tenantStore,
    roleStore,
    apiKeyHasher,
    userService,
    orgService,
    membershipService,
    planService,
    agentService,
    auditLogService,
    auditExporter,
    healthChecks,
    runHealth,
  });
}
