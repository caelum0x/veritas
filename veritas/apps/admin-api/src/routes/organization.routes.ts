// Organization admin routes — CRUD + member management endpoints
import { Router } from "express";
import type { OrganizationService } from "../controllers/organization.controller.js";
import { makeOrganizationController } from "../controllers/organization.controller.js";

export function createOrganizationRouter(orgService: OrganizationService): Router {
  const router = Router();
  const ctrl = makeOrganizationController(orgService);

  router.get("/", ctrl.listOrganizations);
  router.post("/", ctrl.createOrganization);
  router.get("/:id", ctrl.getOrganization);
  router.patch("/:id", ctrl.updateOrganization);
  router.delete("/:id", ctrl.deleteOrganization);
  router.get("/:id/members", ctrl.listMembers);
  router.post("/:id/members", ctrl.addMember);
  router.delete("/:id/members/:userId", ctrl.removeMember);

  return router;
}
