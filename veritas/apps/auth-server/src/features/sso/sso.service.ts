// SSO service — orchestrates IdP login initiation and callback handling via @veritas/sso.

import { ok, err, isErr, type Result, type AppError, UnauthorizedError, NotFoundError } from "@veritas/core";
import {
  type ProviderRegistry,
  type StateStore,
  handleSsoCallback,
  formatCallbackError,
  createState,
  type CallbackParams,
  type SsoPrincipal,
} from "@veritas/sso";
import { generateToken, type SessionTokenPayload } from "@veritas/auth";
import type { Logger } from "@veritas/observability";
import { toSsoAuthResponse, toProviderListItem } from "./sso.mapper.js";
import type { SsoAuthResponse, SsoProviderListItem } from "./sso.schema.js";

/** Port: find or JIT-provision a user from SSO identity attributes. */
export interface UserProvisionPort {
  findOrProvision(params: {
    email: string;
    displayName: string;
    externalId: string;
    providerId: string;
  }): Promise<Result<{ userId: string; organizationId: string; sessionId: string }, AppError>>;
}

export interface TokenConfig {
  readonly secret: string;
  readonly ttlSeconds: number;
}

export interface SsoServiceDeps {
  readonly providerRegistry: ProviderRegistry;
  readonly stateStore: StateStore;
  readonly userProvisionPort: UserProvisionPort;
  readonly tokenConfig: TokenConfig;
  readonly logger: Logger;
}

export interface InitiateResult {
  readonly redirectUrl: string;
  readonly state: string;
}

/** Initiate an SSO login — resolve provider and produce an IdP redirect URL. */
export async function initiateLogin(
  providerId: string,
  relayState: string | undefined,
  deps: SsoServiceDeps,
): Promise<Result<InitiateResult, AppError>> {
  const { providerRegistry, stateStore, logger } = deps;

  const resolveResult = providerRegistry.resolve(providerId);
  if (isErr(resolveResult)) {
    logger.warn("sso.provider_not_found", { providerId });
    return err(new NotFoundError({ message: `SSO provider '${providerId}' not found` }));
  }

  const provider = resolveResult.value;

  let loginResult: Awaited<ReturnType<typeof provider.initiateLogin>>;
  try {
    loginResult = await provider.initiateLogin({ relayState });
  } catch (cause) {
    logger.error("sso.initiate_error", { providerId, error: cause });
    return err(new UnauthorizedError({ message: "Failed to initiate SSO login" }));
  }

  if (isErr(loginResult)) {
    logger.error("sso.initiate_provider_error", { providerId, error: loginResult.error.message });
    return err(new UnauthorizedError({ message: loginResult.error.message }));
  }

  const { redirectUrl } = loginResult.value;
  const stateEntry = await createState(stateStore, providerId, redirectUrl, Date.now());

  logger.info("sso.initiate_success", { providerId, state: stateEntry.state });

  return ok({ redirectUrl, state: stateEntry.state });
}

/** Handle IdP callback, provision user, issue token. */
export async function handleCallback(
  providerId: string,
  params: CallbackParams,
  deps: SsoServiceDeps,
): Promise<Result<SsoAuthResponse, AppError>> {
  const { providerRegistry, stateStore, userProvisionPort, tokenConfig, logger } = deps;

  logger.debug("sso.callback_received", { providerId });

  const callbackResult = await handleSsoCallback(
    { providerId, params },
    providerRegistry,
    stateStore,
    Date.now(),
  );

  if (isErr(callbackResult)) {
    const message = formatCallbackError(callbackResult.error);
    logger.warn("sso.callback_failed", { providerId, error: message });
    return err(new UnauthorizedError({ message }));
  }

  const { assertion } = callbackResult.value;
  const principal: SsoPrincipal = assertion.principal;

  const provisionResult = await userProvisionPort.findOrProvision({
    email: principal.email,
    displayName: principal.displayName,
    externalId: principal.externalId,
    providerId,
  });

  if (isErr(provisionResult)) {
    logger.error("sso.provision_failed", { email: principal.email, error: provisionResult.error.message });
    return err(provisionResult.error);
  }

  const { userId, organizationId, sessionId } = provisionResult.value;

  const expiresAt = Math.floor(Date.now() / 1000) + tokenConfig.ttlSeconds;
  const payload: SessionTokenPayload = { userId, organizationId, sessionId, expiresAt };
  const token = generateToken(tokenConfig.secret, payload);

  logger.info("sso.callback_success", { userId, organizationId, providerId });

  return ok(toSsoAuthResponse(token, userId, organizationId, sessionId));
}

/** List all registered SSO providers. */
export function listProviders(registry: ProviderRegistry): SsoProviderListItem[] {
  return registry.listAll().map(toProviderListItem);
}
