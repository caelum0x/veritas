// Dependency container: instantiates all package services and wires them into a Deps object.

import { createLogger, MetricsRegistry, ConsoleAuditLogger, AlwaysHealthyCheck, type Logger, type AuditLogger, type HealthCheck } from "@veritas/observability";
import { createApiKeyHasher, ApiKeyAuthenticator, generateToken, verifyToken, type SessionTokenPayload, type VerifyTokenOptions, type ApiKeyStore } from "@veritas/auth";
import { createProviderRegistry, createInMemoryStateStore, type ProviderRegistry, type StateStore } from "@veritas/sso";
import { type FactorRepository, type ChallengeRepository, type PolicyRepository } from "@veritas/mfa";
import { EnvSecretsManager, type SecretsManager } from "@veritas/secrets";
import { err, type Result } from "@veritas/core";
import { UnauthorizedError, type AppError } from "@veritas/core";
import type { AppConfig } from "./config.js";
import type { MfaFactor, MfaChallenge, MfaPolicy } from "@veritas/mfa";
import type { UserId } from "@veritas/core";
import type { CredentialVerifier } from "./features/login/login.service.js";
import type { UserProvisionPort, TokenConfig } from "./features/sso/sso.service.js";

/** In-memory factor repository. */
function createInMemoryFactorRepository(): FactorRepository {
  const store = new Map<string, MfaFactor>();
  return {
    async findById(id) { return store.get(id) ?? null; },
    async findByUserId(userId: UserId) { return [...store.values()].filter(f => f.userId === userId); },
    async findActiveByUserId(userId: UserId) { return [...store.values()].filter(f => f.userId === userId && f.status === "active"); },
    async create(factor) { store.set(factor.id, factor); return factor; },
    async update(factor) { store.set(factor.id, factor); return factor; },
    async delete(id) { store.delete(id); },
  };
}

/** In-memory challenge repository. */
function createInMemoryChallengeRepository(): ChallengeRepository {
  const store = new Map<string, MfaChallenge>();
  return {
    async findById(id) { return store.get(id) ?? null; },
    async findPendingByUserId(userId) { return [...store.values()].filter(c => c.userId === userId && c.status === "pending"); },
    async create(challenge) { store.set(challenge.id, challenge); return challenge; },
    async update(challenge) { store.set(challenge.id, challenge); return challenge; },
    async deleteExpired() {
      const now = new Date();
      let count = 0;
      for (const [id, c] of store) {
        if (new Date(c.expiresAt) < now) { store.delete(id); count++; }
      }
      return count;
    },
  };
}

/** In-memory policy repository. */
function createInMemoryPolicyRepository(): PolicyRepository {
  const store = new Map<string, MfaPolicy>();
  return {
    async findById(id) { return store.get(id) ?? null; },
    async findByName(name) { return [...store.values()].find(p => p.name === name) ?? null; },
    async listAll() { return [...store.values()]; },
    async create(policy) { store.set(policy.id, policy); return policy; },
    async update(policy) { store.set(policy.id, policy); return policy; },
    async delete(id) { store.delete(id); },
  };
}

/** In-memory API key store (replaced by a real DB adapter in production). */
function createInMemoryApiKeyStore(): ApiKeyStore {
  return {
    async findByKeyId(_keyId) { return undefined; },
  };
}

/** No-op credential verifier — rejects all password logins (wire a DB-backed impl in production). */
function createNoopCredentialVerifier(): CredentialVerifier {
  return {
    async verify(_email, _password, _orgId) { return null; },
  };
}

/** No-op user provision port — fails all SSO JIT provisioning (wire a DB-backed impl in production). */
function createNoopUserProvisionPort(): UserProvisionPort {
  return {
    async findOrProvision(_params): Promise<Result<{ userId: string; organizationId: string; sessionId: string }, AppError>> {
      return err(new UnauthorizedError({ message: "User provisioning not configured" }));
    },
  };
}

/** Token service wrapping @veritas/auth token primitives. */
export interface TokenService {
  issue(payload: Omit<SessionTokenPayload, "expiresAt">): string;
  verify(token: string, nowMs?: number): ReturnType<typeof verifyToken>;
}

function createTokenService(config: AppConfig): TokenService {
  return {
    issue(payload) {
      const expiresAt = Math.floor(Date.now() / 1000) + config.tokenTtlSeconds;
      return generateToken(config.tokenSecret, { ...payload, expiresAt });
    },
    verify(token, nowMs) {
      const opts: VerifyTokenOptions = { secret: config.tokenSecret, token, nowMs };
      return verifyToken(opts);
    },
  };
}

export interface Deps {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly metrics: MetricsRegistry;
  readonly auditLogger: AuditLogger;
  readonly healthChecks: readonly HealthCheck[];
  readonly secretsManager: SecretsManager;
  readonly tokenService: TokenService;
  readonly tokenConfig: TokenConfig;
  readonly providerRegistry: ProviderRegistry;
  readonly ssoStateStore: StateStore;
  readonly stateStore: StateStore;
  readonly apiKeyAuthenticator: ApiKeyAuthenticator;
  readonly factorRepository: FactorRepository;
  readonly challengeRepository: ChallengeRepository;
  readonly policyRepository: PolicyRepository;
  readonly credentialVerifier: CredentialVerifier;
  readonly userProvisionPort: UserProvisionPort;
}

export function buildContainer(config: AppConfig): Deps {
  const logger = createLogger({ level: config.logLevel, bindings: { service: "auth-server", env: config.env } });
  const metrics = new MetricsRegistry();
  const auditLogger = new ConsoleAuditLogger();
  const secretsManager = new EnvSecretsManager({ envPrefix: "VERITAS" });
  const tokenService = createTokenService(config);
  const tokenConfig: TokenConfig = { secret: config.tokenSecret, ttlSeconds: config.tokenTtlSeconds };
  const providerRegistry = createProviderRegistry();
  const ssoStateStore = createInMemoryStateStore();
  const apiKeyHasher = createApiKeyHasher();
  const apiKeyStore = createInMemoryApiKeyStore();
  const apiKeyAuthenticator = new ApiKeyAuthenticator(apiKeyStore, apiKeyHasher);
  const factorRepository = createInMemoryFactorRepository();
  const challengeRepository = createInMemoryChallengeRepository();
  const policyRepository = createInMemoryPolicyRepository();
  const credentialVerifier = createNoopCredentialVerifier();
  const userProvisionPort = createNoopUserProvisionPort();
  const healthChecks: HealthCheck[] = [new AlwaysHealthyCheck("auth-server")];

  return {
    config,
    logger,
    metrics,
    auditLogger,
    healthChecks,
    secretsManager,
    tokenService,
    tokenConfig,
    providerRegistry,
    ssoStateStore,
    stateStore: ssoStateStore,
    apiKeyAuthenticator,
    factorRepository,
    challengeRepository,
    policyRepository,
    credentialVerifier,
    userProvisionPort,
  };
}
