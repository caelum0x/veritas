// Postmortem template — structured blameless post-incident review document.
import { z } from "zod";
import { newId } from "@veritas/core";

export const PostmortemStatusSchema = z.enum(["draft", "in_review", "approved", "published"]);
export type PostmortemStatus = z.infer<typeof PostmortemStatusSchema>;

export const ActionItemPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export type ActionItemPriority = z.infer<typeof ActionItemPrioritySchema>;

export const ActionItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  ownerId: z.string().nullable(),
  priority: ActionItemPrioritySchema,
  dueDate: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

export const PostmortemSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  status: PostmortemStatusSchema,
  title: z.string(),
  summary: z.string(),
  impactDescription: z.string(),
  rootCauses: z.array(z.string()),
  triggeringEvents: z.array(z.string()),
  detectionDescription: z.string(),
  responseDescription: z.string(),
  resolutionDescription: z.string(),
  lessonsLearned: z.array(z.string()),
  actionItems: z.array(ActionItemSchema),
  authorId: z.string(),
  reviewerIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
});
export type Postmortem = z.infer<typeof PostmortemSchema>;

export interface CreatePostmortemOptions {
  readonly incidentId: string;
  readonly title: string;
  readonly authorId: string;
  readonly now: string;
}

export function createPostmortem(opts: CreatePostmortemOptions): Postmortem {
  return {
    id: newId("pm"),
    incidentId: opts.incidentId,
    status: "draft",
    title: opts.title,
    summary: "",
    impactDescription: "",
    rootCauses: [],
    triggeringEvents: [],
    detectionDescription: "",
    responseDescription: "",
    resolutionDescription: "",
    lessonsLearned: [],
    actionItems: [],
    authorId: opts.authorId,
    reviewerIds: [],
    createdAt: opts.now,
    updatedAt: opts.now,
    publishedAt: null,
  };
}

export function addActionItem(
  postmortem: Postmortem,
  item: Omit<ActionItem, "id" | "completedAt">,
  now: string,
): Postmortem {
  const newItem: ActionItem = { ...item, id: newId("ai"), completedAt: null };
  return { ...postmortem, actionItems: [...postmortem.actionItems, newItem], updatedAt: now };
}

export function completeActionItem(
  postmortem: Postmortem,
  actionItemId: string,
  now: string,
): Postmortem {
  const updatedItems = postmortem.actionItems.map((item) =>
    item.id === actionItemId ? { ...item, completedAt: now } : item,
  );
  return { ...postmortem, actionItems: updatedItems, updatedAt: now };
}

export function transitionPostmortemStatus(
  postmortem: Postmortem,
  nextStatus: PostmortemStatus,
  now: string,
): Postmortem {
  const publishedAt = nextStatus === "published" ? now : postmortem.publishedAt;
  return { ...postmortem, status: nextStatus, publishedAt, updatedAt: now };
}

export function countOpenActionItems(postmortem: Postmortem): number {
  return postmortem.actionItems.filter((i) => i.completedAt === null).length;
}
