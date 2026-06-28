// BFF verify route: proxies claim verification requests to the upstream API via SDK.
import { z } from "zod";
import type { Logger } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import type { VeritasClient } from "@veritas/sdk/client.js";
import type { Router } from "express";

interface VerifyDeps {
  client: VeritasClient;
  logger: Logger;
}

const VerifyBodySchema = z.object({
  claims: z.array(z.string().min(1)).optional(),
  text: z.string().min(1).optional(),
  context: z.string().optional(),
  options: z
    .object({
      allowedDomains: z.array(z.string()).optional(),
    })
    .optional(),
});

export function registerVerifyRoutes(router: Router, deps: VerifyDeps): void {
  const { client, logger } = deps;

  router.post("/verify", async (req, res, next) => {
    try {
      const parsed = VerifyBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError({
          message: "invalid verify request body",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
      }

      const { claims, text, context, options } = parsed.data;
      const report = await client.verification.submit({ claims, text, context }, options);

      logger.info("verification submitted", { claims: claims?.slice(0, 3) });
      res.status(202).json({ success: true, data: report });
    } catch (err) {
      logger.error("verify route error", { error: err });
      next(err);
    }
  });

  router.get("/verify/:verificationId", async (req, res, next) => {
    try {
      const { verificationId } = req.params;
      const report = await client.verification.get(verificationId);
      res.json({ success: true, data: report });
    } catch (err) {
      logger.error("get verification error", { error: err });
      next(err);
    }
  });

  router.get("/verify", async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query["limit"] ?? 20), 100);
      const cursor = typeof req.query["cursor"] === "string" ? req.query["cursor"] : undefined;
      const claimId = typeof req.query["claimId"] === "string" ? req.query["claimId"] : undefined;

      const page = await client.verification.list({ limit, cursor, claimId });
      res.json({ success: true, data: page });
    } catch (err) {
      logger.error("list verifications error", { error: err });
      next(err);
    }
  });
}
