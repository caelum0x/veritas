// Login controller — validates input, calls login service, sends JSON response.

import type { Request, Response, NextFunction } from "express";
import { isOk, isErr } from "@veritas/core";
import { LoginRequestSchema } from "./login.schema.js";
import { loginWithCredentials, type LoginServiceDeps } from "./login.service.js";

export class LoginController {
  constructor(private readonly deps: LoginServiceDeps) {}

  /** POST /auth/login — exchange credentials for a signed session token. */
  handleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const result = await loginWithCredentials(parsed.data, this.deps).catch(
      (e: unknown) => { next(e); return null; },
    );
    if (result === null) return;

    if (isErr(result)) {
      const status = result.error.message.includes("unavailable") ? 503 : 401;
      res.status(status).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: result.error.message },
      });
      return;
    }

    res.status(200).json({ success: true, data: result.value });
  };
}
