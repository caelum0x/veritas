// Registers payments feature routes on the provided router under /payments.

import type { Router } from "express";
import type { Deps } from "../../container.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsController } from "./payments.controller.js";

export function registerPaymentsRoutes(router: Router, deps: Deps): void {
  const service = new PaymentsService(deps);
  const ctrl = new PaymentsController(service);

  /** GET /payments — list payments for an organization */
  router.get("/payments", (req, res) => ctrl.list(req, res));

  /** GET /payments/:paymentId — retrieve a single payment by id */
  router.get("/payments/:paymentId", (req, res) => ctrl.getOne(req, res));

  /** POST /payments/charge — initiate a charge against an order */
  router.post("/payments/charge", (req, res) => ctrl.charge(req, res));

  /** POST /payments/refund — refund a previous charge */
  router.post("/payments/refund", (req, res) => ctrl.refund(req, res));
}
