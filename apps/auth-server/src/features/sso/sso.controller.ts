// SSO controller — validates inputs, delegates to SSO service, sends HTTP responses.

import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { SsoInitiateRequestSchema } from "./sso.schema.js";
import {
  initiateLogin,
  handleCallback,
  listProviders,
  type SsoServiceDeps,
} from "./sso.service.js";
import type { CallbackParams } from "@veritas/sso";

export class SsoController {
  constructor(private readonly deps: SsoServiceDeps) {}

  /** GET /auth/sso/initiate?providerId=<id>[&relayState=<state>] */
  initiate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = SsoInitiateRequestSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "providerId query parameter is required",
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const result = await initiateLogin(
      parsed.data.providerId,
      parsed.data.relayState,
      this.deps,
    ).catch((e: unknown) => { next(e); return null; });
    if (result === null) return;

    if (isErr(result)) {
      const status = result.error.message.includes("not found") ? 404 : 502;
      res.status(status).json({
        success: false,
        error: { code: "SSO_INITIATE_FAILED", message: result.error.message },
      });
      return;
    }

    res.redirect(302, result.value.redirectUrl);
  };

  /** GET|POST /auth/sso/callback/:providerId */
  callback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const providerId =
      (req.params["providerId"] as string | undefined) ??
      (req.query["providerId"] as string | undefined) ??
      "";

    if (!providerId) {
      res.status(422).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "providerId is required" },
      });
      return;
    }

    const rawParams: Record<string, string> = {};
    for (const [k, v] of Object.entries({ ...req.query, ...req.body })) {
      if (typeof v === "string") rawParams[k] = v;
    }
    const params: CallbackParams = rawParams;

    const result = await handleCallback(providerId, params, this.deps).catch(
      (e: unknown) => { next(e); return null; },
    );
    if (result === null) return;

    if (isErr(result)) {
      res.status(401).json({
        success: false,
        error: { code: "SSO_CALLBACK_FAILED", message: result.error.message },
      });
      return;
    }

    res.status(200).json({ success: true, data: result.value });
  };

  /** GET /auth/sso/providers — list all registered SSO providers. */
  listProviders = (_req: Request, res: Response): void => {
    const providers = listProviders(this.deps.providerRegistry);
    res.status(200).json({ success: true, data: providers });
  };
}
