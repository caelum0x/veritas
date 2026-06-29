// Partners routes — registers partner CRUD, agreement, contact, and onboarding endpoints
import { Router } from "express";
import { requirePortalAuth, requirePortalScope } from "../../middleware/auth.js";
import { PartnersController } from "./partners.controller.js";
import type { PartnersService } from "./partners.service.js";

export interface PartnersRouteDeps {
  readonly partnersService: PartnersService;
}

export function registerPartnersRoutes(router: Router, deps: PartnersRouteDeps): void {
  const ctrl = new PartnersController(deps.partnersService);

  router.use(requirePortalAuth);

  // ---------------------------------------------------------------------------
  // Partners
  // ---------------------------------------------------------------------------

  /** POST /partners — create a new partner */
  router.post("/", requirePortalScope("partners:write"), (req, res, next) => ctrl.create(req, res, next));

  /** GET /partners — list all partners */
  router.get("/", requirePortalScope("partners:read"), (req, res, next) => ctrl.list(req, res, next));

  /** GET /partners/:id — get a single partner */
  router.get("/:id", requirePortalScope("partners:read"), (req, res, next) => ctrl.get(req, res, next));

  /** PATCH /partners/:id — update partner details */
  router.patch("/:id", requirePortalScope("partners:write"), (req, res, next) => ctrl.update(req, res, next));

  // ---------------------------------------------------------------------------
  // Agreements
  // ---------------------------------------------------------------------------

  /** POST /partners/agreements — create a new partner agreement */
  router.post("/agreements", requirePortalScope("partners:write"), (req, res, next) => ctrl.createAgreement(req, res, next));

  /** GET /partners/:id/agreements — list agreements for a partner */
  router.get("/:id/agreements", requirePortalScope("partners:read"), (req, res, next) => ctrl.listAgreements(req, res, next));

  /** POST /partners/agreements/:agreementId/sign — sign an agreement */
  router.post("/agreements/:agreementId/sign", requirePortalScope("partners:write"), (req, res, next) => ctrl.signAgreement(req, res, next));

  /** POST /partners/agreements/:agreementId/terminate — terminate an agreement */
  router.post("/agreements/:agreementId/terminate", requirePortalScope("partners:write"), (req, res, next) => ctrl.terminateAgreement(req, res, next));

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  /** POST /partners/contacts — add a contact to a partner */
  router.post("/contacts", requirePortalScope("partners:write"), (req, res, next) => ctrl.addContact(req, res, next));

  /** GET /partners/:id/contacts — list contacts for a partner */
  router.get("/:id/contacts", requirePortalScope("partners:read"), (req, res, next) => ctrl.listContacts(req, res, next));

  /** PATCH /partners/contacts/:contactId — update a contact */
  router.patch("/contacts/:contactId", requirePortalScope("partners:write"), (req, res, next) => ctrl.updateContact(req, res, next));

  /** DELETE /partners/contacts/:contactId — remove a contact */
  router.delete("/contacts/:contactId", requirePortalScope("partners:write"), (req, res, next) => ctrl.removeContact(req, res, next));

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  /** POST /partners/:id/onboarding — start onboarding for a partner */
  router.post("/:id/onboarding", requirePortalScope("partners:write"), (req, res, next) => ctrl.startOnboarding(req, res, next));

  /** POST /partners/onboarding/:onboardingId/advance — advance to the next onboarding step */
  router.post("/onboarding/:onboardingId/advance", requirePortalScope("partners:write"), (req, res, next) => ctrl.advanceOnboardingStep(req, res, next));

  /** POST /partners/onboarding/:onboardingId/abandon — abandon an onboarding session */
  router.post("/onboarding/:onboardingId/abandon", requirePortalScope("partners:write"), (req, res, next) => ctrl.abandonOnboarding(req, res, next));
}
