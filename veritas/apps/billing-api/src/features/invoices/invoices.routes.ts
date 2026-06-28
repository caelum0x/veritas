// Invoice routes: mounts all invoice lifecycle endpoints on the provided router.

import type { Router } from "express";
import { InvoiceGenerator } from "@veritas/billing";
import type { Deps } from "../../container.js";
import { InvoiceService } from "./invoices.service.js";
import { InvoicesController } from "./invoices.controller.js";

export function registerInvoicesRoutes(router: Router, deps: Deps): void {
  const invoiceGenerator = new InvoiceGenerator({ logger: deps.logger });

  const service = new InvoiceService({
    logger: deps.logger,
    invoiceGenerator,
    ledger: deps.ledger,
    taxCalculator: deps.taxCalculator,
  });
  const ctrl = new InvoicesController(service);

  /** GET /invoices — list invoices with optional org/status filters */
  router.get("/invoices", (req, res) => ctrl.listInvoices(req, res));

  /** POST /invoices/generate — generate a new invoice from plan + usage */
  router.post("/invoices/generate", (req, res) => ctrl.generateInvoice(req, res));

  /** GET /invoices/:invoiceId — get a single invoice by id */
  router.get("/invoices/:invoiceId", (req, res) => ctrl.getInvoice(req, res));

  /** POST /invoices/:invoiceId/finalize — move invoice from DRAFT to OPEN */
  router.post("/invoices/:invoiceId/finalize", (req, res) => ctrl.finalizeInvoice(req, res));

  /** POST /invoices/:invoiceId/pay — mark invoice as PAID */
  router.post("/invoices/:invoiceId/pay", (req, res) => ctrl.markPaid(req, res));

  /** POST /invoices/:invoiceId/void — void a non-paid invoice */
  router.post("/invoices/:invoiceId/void", (req, res) => ctrl.voidInvoice(req, res));

  /** POST /invoices/:invoiceId/tax — calculate and attach tax to an invoice */
  router.post("/invoices/:invoiceId/tax", (req, res) => ctrl.applyTax(req, res));
}
