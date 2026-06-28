// Login controller: validates credentials, issues session tokens, returns auth response.

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ok, err, isOk, isErr } from "@veritas/core";
import { generateToken } from "@veritas/auth";
import type { TokenService } from "../token-service.js";

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  organizationId: z.string().optional(),
});

export interface CredentialVerifier {
  verify(email: string, password: string, orgId?: string): Promise<
    | { userId: string; organizationId: string; sessionId: string }
    | null
  >;
}

export class LoginController {
  constructor(
    private readonly verifier: CredentialVerifier,
    private readonly tokens: TokenService,
  ) {}

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = LoginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      });
      return;
    }

    const { email, password, organizationId } = parsed.data;

    let principal: { userId: string; organizationId: string; sessionId: string } | null;
    try {
      principal = await this.verifier.verify(email, password, organizationId);
    } catch (e) {
      next(e);
      return;
    }

    if (principal === null) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" },
      });
      return;
    }

    const tokenResult = this.tokens.issue({
      userId: principal.userId,
      organizationId: principal.organizationId,
      sessionId: principal.sessionId,
    });

    if (isErr(tokenResult)) {
      next(tokenResult.error);
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        token: tokenResult.value,
        userId: principal.userId,
        organizationId: principal.organizationId,
        sessionId: principal.sessionId,
      },
    });
  };
}
