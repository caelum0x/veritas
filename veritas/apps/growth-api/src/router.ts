// Mounts all feature sub-routers onto the authenticated /v1 Express router.
import { Router } from "express";
import type { Deps } from "./container.js";
import { registerReferralsRoutes } from "./features/referrals/referrals.routes.js";
import { registerCreditsRoutes } from "./features/credits/credits.routes.js";
import { registerCouponsRoutes } from "./features/coupons/coupons.routes.js";
import { registerTrialsRoutes } from "./features/trials/trials.routes.js";
import { registerOnboardingRoutes } from "./features/onboarding/onboarding.routes.js";
import { makeCouponServicePort } from "./coupon-port-adapter.js";

export function buildRouter(deps: Deps): Router {
  const root = Router();

  // Referrals: register fn uses full paths (/referrals/...)
  registerReferralsRoutes(root, deps);

  // Credits: register fn uses full paths (/credits/...)
  registerCreditsRoutes(root, deps);

  // Coupons: feature registers relative paths; mount under /coupons
  const couponsRouter = Router();
  const couponPort = makeCouponServicePort(deps.couponStore);
  registerCouponsRoutes(couponsRouter, { couponPort });
  root.use("/coupons", couponsRouter);

  // Trials: feature registers relative paths; mount under /trials
  const trialsRouter = Router();
  registerTrialsRoutes(trialsRouter);
  root.use("/trials", trialsRouter);

  // Onboarding: feature registers relative paths; mount under /onboarding
  const onboardingRouter = Router();
  registerOnboardingRoutes(onboardingRouter, { logger: deps.logger });
  root.use("/onboarding", onboardingRouter);

  return root;
}
