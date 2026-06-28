// Express router wiring coupon lookup, creation, redemption, and campaign endpoints.
import { Router } from "express";
import type { CouponsController } from "../controllers/coupons.controller.js";

export function createCouponsRouter(ctrl: CouponsController): Router {
  const router = Router();

  // Campaign sub-routes (declared before /:id to avoid shadowing)
  router.get("/campaigns", (req, res, next) => ctrl.listCampaigns(req, res, next));
  router.post("/campaigns", (req, res, next) => ctrl.createCampaign(req, res, next));
  router.get("/campaigns/:id", (req, res, next) => ctrl.getCampaign(req, res, next));
  router.put("/campaigns/:id", (req, res, next) => ctrl.updateCampaign(req, res, next));
  router.post("/campaigns/:id/coupons/:couponId", (req, res, next) => ctrl.addCouponToCampaign(req, res, next));

  // Look up a coupon by redemption code
  router.get("/code/:code", (req, res, next) => ctrl.getCouponByCode(req, res, next));

  // Redeem a coupon by code
  router.post("/code/:code/redeem", (req, res, next) => ctrl.redeemCoupon(req, res, next));

  // List all coupons (optionally filtered by ?campaignId=)
  router.get("/", (req, res, next) => ctrl.listCoupons(req, res, next));

  // Create a new coupon
  router.post("/", (req, res, next) => ctrl.createCoupon(req, res, next));

  // Get coupon by id + its redemptions
  router.get("/:id", (req, res, next) => ctrl.getCoupon(req, res, next));
  router.get("/:id/redemptions", (req, res, next) => ctrl.listRedemptions(req, res, next));
  router.delete("/:id", (req, res, next) => ctrl.deactivateCoupon(req, res, next));

  return router;
}
