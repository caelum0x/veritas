// Organization route definitions — CRUD + member listing
import { Router } from "express";
import {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
} from "../controllers/organization.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, listOrganizations);
router.post("/", requireAuth, createOrganization);
router.get("/:id", requireAuth, getOrganization);
router.patch("/:id", requireAuth, updateOrganization);
router.delete("/:id", requireAuth, requireRole("admin"), deleteOrganization);
router.get("/:id/members", requireAuth, getOrganizationMembers);

export { router as organizationRouter };
