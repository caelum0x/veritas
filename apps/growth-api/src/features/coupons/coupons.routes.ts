// Mounts all coupon and campaign endpoints and exports registerCouponsRoutes.
import { Router } from "express";
import type { CouponServicePort } from "../../controllers/coupons.controller.js";
import { CouponsService } from "./coupons.service.js";
import { CouponsFeatureController } from "./coupons.controller.js";

export interface CouponsDeps {
  readonly couponPort: CouponServicePort;
}

export function registerCouponsRoutes(router: Router, deps: CouponsDeps): void {
  const service = new CouponsService(deps.couponPort);
  const ctrl = new CouponsFeatureController(service);

  // Campaign sub-routes declared before /:id to prevent route shadowing
  router.get("/campaigns", (req, res, next) => ctrl.listCampaigns(req, res, next));
  router.post("/campaigns", (req, res, next) => ctrl.createCampaign(req, res, next));
  router.get("/campaigns/:id", (req, res, next) => ctrl.getCampaign(req, res, next));
  router.put("/campaigns/:id", (req, res, next) => ctrl.updateCampaign(req, res, next));
  router.post("/campaigns/:id/coupons/:couponId", (req, res, next) => ctrl.addCouponToCampaign(req, res, next));

  // Coupon lookup by code
  router.get("/code/:code", (req, res, next) => ctrl.getByCode(req, res, next));

  // Redeem by code (code is part of the body to enable idempotency middleware upstream)
  router.post("/redeem", (req, res, next) => ctrl.redeem(req, res, next));

  // List all coupons, optionally filtered by ?campaignId=
  router.get("/", (req, res, next) => ctrl.list(req, res, next));

  // Create a coupon
  router.post("/", (req, res, next) => ctrl.create(req, res, next));

  // Coupon by id
  router.get("/:id", (req, res, next) => ctrl.getById(req, res, next));
  router.get("/:id/redemptions", (req, res, next) => ctrl.listRedemptions(req, res, next));
  router.delete("/:id", (req, res, next) => ctrl.deactivate(req, res, next));
}
