// SSO controller: initiates login redirects and handles IdP callbacks via @veritas/sso.

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isOk, isErr } from "@veritas/core";
import {
  type ProviderRegistry,
  type StateStore,
  handleSsoCallback,
  formatCallbackError,
  createState,
} from "@veritas/sso";
import type { TokenService } from "../token-service.js";
import type { UserProvisionPort } from "./mfa.controller.js";

const InitiateQuerySchema = z.object({
  providerId: z.string().min(1),
  relayState: z.string().optional(),
});

const CallbackQuerySchema = z.object({
  providerId: z.string().min(1),
});

export class SsoController {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly stateStore: StateStore,
    private readonly tokens: TokenService,
    private readonly userPort: UserProvisionPort,
  ) {}

  initiateLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = InitiateQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "providerId is required" },
      });
      return;
    }

    const { providerId, relayState } = parsed.data;

    const resolveResult = this.registry.resolve(providerId);
    if (isErr(resolveResult)) {
      res.status(404).json({
        success: false,
        error: { code: "PROVIDER_NOT_FOUND", message: `SSO provider '${providerId}' not found` },
      });
      return;
    }

    const provider = resolveResult.value;
    const loginResult = await provider.initiateLogin({ relayState }).catch((e: unknown) => {
      next(e);
      return null;
    });
    if (loginResult === null) return;

    if (isErr(loginResult)) {
      res.status(502).json({
        success: false,
        error: { code: "PROVIDER_ERROR", message: loginResult.error.message },
      });
      return;
    }

    const { redirectUrl } = loginResult.value;
    await createState(this.stateStore, providerId, redirectUrl, Date.now());
    res.redirect(302, redirectUrl);
  };

  handleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const providerId =
      (req.params["providerId"] as string | undefined) ??
      (req.query["providerId"] as string | undefined) ?? "";

    if (!providerId) {
      res.status(422).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "providerId is required" },
      });
      return;
    }

    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries({ ...req.query, ...req.body })) {
      if (typeof v === "string") params[k] = v;
    }

    const callbackResult = await handleSsoCallback(
      { providerId, params },
      this.registry,
      this.stateStore,
      Date.now(),
    ).catch((e: unknown) => { next(e); return null; });
    if (callbackResult === null) return;

    if (isErr(callbackResult)) {
      const message = formatCallbackError(callbackResult.error);
      res.status(401).json({ success: false, error: { code: "SSO_CALLBACK_FAILED", message } });
      return;
    }

    const { assertion } = callbackResult.value;
    const principal = assertion.principal;

    const userResult = await this.userPort.findOrProvision({
      email: principal.email,
      displayName: principal.displayName,
      externalId: principal.externalId,
      providerId,
    }).catch((e: unknown) => { next(e); return null; });
    if (userResult === null) return;

    if (isErr(userResult)) {
      next(userResult.error);
      return;
    }

    const { userId, organizationId, sessionId } = userResult.value;

    const tokenResult = this.tokens.issue({ userId, organizationId, sessionId });
    if (isErr(tokenResult)) {
      next(tokenResult.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        token: tokenResult.value,
        userId,
        organizationId,
        sessionId,
      },
    });
  };
}
