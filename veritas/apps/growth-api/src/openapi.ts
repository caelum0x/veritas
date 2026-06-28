// OpenAPI 3.1 spec document for growth-api, served at GET /openapi.json.
import type { Request, Response } from "express";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Veritas Growth API",
    version: "1.0.0",
    description:
      "Enterprise growth endpoints: referrals, credits, coupons, trials, and onboarding.",
  },
  servers: [{ url: "/v1", description: "Current version" }],
  paths: {
    "/referrals/programs": {
      get: { summary: "List referral programs", tags: ["Referrals"] },
      post: { summary: "Create a referral program", tags: ["Referrals"] },
    },
    "/referrals/{id}/click": {
      post: { summary: "Register a referral click", tags: ["Referrals"] },
    },
    "/referrals/{id}/attribute": {
      post: { summary: "Attribute a signup to a referral", tags: ["Referrals"] },
    },
    "/referrals/{id}/rewards": {
      post: { summary: "Issue rewards for a referral", tags: ["Referrals"] },
    },
    "/credits/balance/{userId}": {
      get: { summary: "Get credit balance", tags: ["Credits"] },
    },
    "/credits/grant": {
      post: { summary: "Grant credits to a user", tags: ["Credits"] },
    },
    "/credits/consume": {
      post: { summary: "Consume credits from a user", tags: ["Credits"] },
    },
    "/coupons": {
      get: { summary: "List coupons", tags: ["Coupons"] },
    },
    "/coupons/validate": {
      post: { summary: "Validate a coupon code", tags: ["Coupons"] },
    },
    "/trials": {
      post: { summary: "Start a trial", tags: ["Trials"] },
    },
    "/trials/{id}/convert": {
      post: { summary: "Convert a trial to paid", tags: ["Trials"] },
    },
    "/onboarding/flows/{flowId}": {
      get: { summary: "Get onboarding checklist", tags: ["Onboarding"] },
    },
    "/onboarding/flows/{flowId}/steps/{stepId}/complete": {
      post: { summary: "Complete an onboarding step", tags: ["Onboarding"] },
    },
    "/health/live": { get: { summary: "Liveness probe" } },
    "/health/ready": { get: { summary: "Readiness probe" } },
  },
  components: { securitySchemes: { ApiKey: { type: "http", scheme: "bearer" } } },
  security: [{ ApiKey: [] }],
};

export function openApiHandler(_req: Request, res: Response): void {
  res.status(200).json(spec);
}
