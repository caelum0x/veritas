// Registers all tax API routes on the provided Express router.

import type { Router } from "express";
import type { Deps } from "../../container.js";
import { createTaxService } from "./tax.service.js";
import { TaxController } from "./tax.controller.js";

export function registerTaxRoutes(router: Router, deps: Deps): void {
  const service = createTaxService(deps);
  const ctrl = new TaxController(service);

  // Tax calculation
  router.post("/tax/calculate", ctrl.calculateTax);

  // Tax rates lookup
  router.get("/tax/rates", ctrl.getRates);

  // Tax registrations
  router.post("/tax/registrations", ctrl.createRegistration);
  router.get("/tax/registrations", ctrl.listRegistrations);
  router.get("/tax/registrations/:registrationId", ctrl.getRegistration);
  router.post(
    "/tax/registrations/:registrationId/activate",
    ctrl.activateRegistration,
  );
  router.post(
    "/tax/registrations/:registrationId/suspend",
    ctrl.suspendRegistration,
  );

  // Tax exemptions
  router.post("/tax/exemptions", ctrl.createExemption);
  router.get("/tax/exemptions", ctrl.listExemptions);
  router.get("/tax/exemptions/resolve", ctrl.resolveExemption);
}
