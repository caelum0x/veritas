// Admin controller for organization CRUD and membership management
import type { Request, Response, NextFunction } from "express";
import type { PageMeta } from "@veritas/core";
import { sendOk, sendCreated, sendNoContent, sendPage } from "../http/responder.js";
import { HttpError } from "../http/api-error.js";
import type {
  ListOrganizationsInput,
  GetOrganizationInput,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  DeleteOrganizationInput,
} from "../validators/organization.validator.js";
import {
  listOrganizationsSchema,
  getOrganizationSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
  deleteOrganizationSchema,
} from "../validators/organization.validator.js";

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  planId?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MemberRecord {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "member" | "viewer";
  createdAt: string;
}

export interface OrganizationService {
  listOrganizations(params: {
    page: number;
    limit: number;
    search?: string;
    planId?: string;
  }): Promise<{ items: OrganizationRecord[]; total: number; page: number; limit: number }>;
  getOrganizationById(id: string): Promise<OrganizationRecord | null>;
  createOrganization(data: {
    name: string;
    slug: string;
    planId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<OrganizationRecord>;
  updateOrganization(
    id: string,
    data: Partial<Pick<OrganizationRecord, "name" | "slug" | "planId" | "metadata">>,
  ): Promise<OrganizationRecord | null>;
  deleteOrganization(id: string): Promise<boolean>;
  listMembers(organizationId: string): Promise<MemberRecord[]>;
  addMember(organizationId: string, userId: string, role: MemberRecord["role"]): Promise<MemberRecord>;
  removeMember(organizationId: string, userId: string): Promise<boolean>;
}

export function makeOrganizationController(orgService: OrganizationService) {
  async function listOrganizations(
    req: Request & { validated?: ListOrganizationsInput },
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const parsed = listOrganizationsSchema.safeParse({ query: req.query });
      if (!parsed.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid query parameters"));
      }
      const { page = 1, limit = 20, search, planId } = parsed.data.query as {
        page?: number; limit?: number; search?: string; planId?: string;
      };
      const result = await orgService.listOrganizations({ page: Number(page), limit: Number(limit), search, planId });
      const meta: PageMeta = { total: result.total, nextCursor: null, hasMore: false };
      sendPage(res, result.items, meta);
    } catch (e) {
      next(e);
    }
  }

  async function getOrganization(
    req: Request & { validated?: GetOrganizationInput },
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = getOrganizationSchema.safeParse({ params: req.params });
      if (!params.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid organization id"));
      }
      const org = await orgService.getOrganizationById(params.data.params.id);
      if (org === null) {
        return next(new HttpError(404, "NOT_FOUND", `Organization '${params.data.params.id}' not found`));
      }
      sendOk(res, org);
    } catch (e) {
      next(e);
    }
  }

  async function createOrganization(
    req: Request & { validated?: CreateOrganizationInput },
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = createOrganizationSchema.safeParse({ body: req.body });
      if (!input.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid request body"));
      }
      const { name, slug, planId, metadata } = input.data.body;
      const org = await orgService.createOrganization({ name, slug, planId, metadata });
      sendCreated(res, org);
    } catch (e) {
      next(e);
    }
  }

  async function updateOrganization(
    req: Request & { validated?: UpdateOrganizationInput },
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = getOrganizationSchema.safeParse({ params: req.params });
      if (!params.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid organization id"));
      }
      const body = updateOrganizationSchema.safeParse({ params: req.params, body: req.body });
      if (!body.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid request body"));
      }
      const { name, slug, planId, metadata } = body.data.body;
      const org = await orgService.updateOrganization(params.data.params.id, { name, slug, planId, metadata });
      if (org === null) {
        return next(new HttpError(404, "NOT_FOUND", `Organization '${params.data.params.id}' not found`));
      }
      sendOk(res, org);
    } catch (e) {
      next(e);
    }
  }

  async function deleteOrganization(
    req: Request & { validated?: DeleteOrganizationInput },
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = deleteOrganizationSchema.safeParse({ params: req.params });
      if (!params.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid organization id"));
      }
      const deleted = await orgService.deleteOrganization(params.data.params.id);
      if (!deleted) {
        return next(new HttpError(404, "NOT_FOUND", `Organization '${params.data.params.id}' not found`));
      }
      sendNoContent(res);
    } catch (e) {
      next(e);
    }
  }

  async function listMembers(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = getOrganizationSchema.safeParse({ params: req.params });
      if (!params.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid organization id"));
      }
      const members = await orgService.listMembers(params.data.params.id);
      sendOk(res, members);
    } catch (e) {
      next(e);
    }
  }

  async function addMember(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = getOrganizationSchema.safeParse({ params: req.params });
      if (!params.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid organization id"));
      }
      const { userId, role } = req.body as { userId: string; role: MemberRecord["role"] };
      if (typeof userId !== "string" || userId.length === 0) {
        return next(new HttpError(422, "VALIDATION", "userId is required"));
      }
      const validRoles = ["owner", "admin", "member", "viewer"] as const;
      if (!validRoles.includes(role)) {
        return next(new HttpError(422, "VALIDATION", `role must be one of: ${validRoles.join(", ")}`));
      }
      const member = await orgService.addMember(params.data.params.id, userId, role);
      sendCreated(res, member);
    } catch (e) {
      next(e);
    }
  }

  async function removeMember(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = getOrganizationSchema.safeParse({ params: req.params });
      if (!params.success) {
        return next(new HttpError(422, "VALIDATION", "Invalid organization id"));
      }
      const { userId } = req.params as { userId: string };
      if (typeof userId !== "string" || userId.length === 0) {
        return next(new HttpError(422, "VALIDATION", "userId is required"));
      }
      const removed = await orgService.removeMember(params.data.params.id, userId);
      if (!removed) {
        return next(new HttpError(404, "NOT_FOUND", `Member '${userId}' not found in organization '${params.data.params.id}'`));
      }
      sendNoContent(res);
    } catch (e) {
      next(e);
    }
  }

  return { listOrganizations, getOrganization, createOrganization, updateOrganization, deleteOrganization, listMembers, addMember, removeMember };
}
