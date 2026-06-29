// Mounts inbound webhook receive routes onto the provided Express router.

import type { Router } from "express";
import type { Deps } from "../../container.js";
import { InboundController } from "./inbound.controller.js";

/** Registers POST /webhooks/:source (cap | payment) for inbound webhook receipt. */
export function registerInboundRoutes(router: Router, deps: Deps): void {
  const ctrl = new InboundController(deps);

  // POST /webhooks/:source — receive and verify an inbound webhook event
  router.post("/webhooks/:source", (req, res) => {
    void ctrl.receiveWebhook(req, res);
  });
}
