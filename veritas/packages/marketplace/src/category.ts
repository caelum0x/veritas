// Category entity: hierarchical taxonomy for marketplace service listings.

import { z } from "zod";
import { newId, type Id, type IsoTimestamp, epochToIso } from "@veritas/core";

/** Branded id for categories. */
export type CategoryId = Id<"cat">;

export const newCategoryId = (): CategoryId => newId("cat");

/** Immutable category node (supports a single level of parent nesting). */
export interface Category {
  readonly id: CategoryId;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly parentId: CategoryId | null;
  readonly iconUrl: string | null;
  readonly sortOrder: number;
  readonly active: boolean;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Input to create a Category. */
export interface CreateCategoryInput {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly parentId?: CategoryId | null;
  readonly iconUrl?: string | null;
  readonly sortOrder?: number;
}

export const createCategorySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  parentId: z.string().nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/** Factory: build a new Category from validated input. */
export function createCategory(input: CreateCategoryInput): Category {
  const now = epochToIso(Date.now());
  return {
    id: newCategoryId(),
    slug: input.slug,
    name: input.name.trim(),
    description: input.description.trim(),
    parentId: input.parentId ?? null,
    iconUrl: input.iconUrl ?? null,
    sortOrder: input.sortOrder ?? 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Return a new Category with patch applied. */
export function applyCategory(
  category: Category,
  patch: UpdateCategoryInput,
): Category {
  return {
    ...category,
    ...(patch.slug !== undefined && { slug: patch.slug }),
    ...(patch.name !== undefined && { name: patch.name.trim() }),
    ...(patch.description !== undefined && { description: patch.description.trim() }),
    ...(patch.parentId !== undefined && { parentId: patch.parentId as CategoryId | null }),
    ...(patch.iconUrl !== undefined && { iconUrl: patch.iconUrl }),
    ...(patch.sortOrder !== undefined && { sortOrder: patch.sortOrder }),
    updatedAt: epochToIso(Date.now()),
  };
}

/** Return a new Category with active=false. */
export function deactivateCategory(category: Category): Category {
  return { ...category, active: false, updatedAt: epochToIso(Date.now()) };
}

/** Return a sorted (by sortOrder asc, name asc) copy of categories. */
export function sortCategories(categories: readonly Category[]): Category[] {
  return [...categories].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

/** Build a flat list of category ids that are descendants of `rootId`. */
export function collectDescendantIds(
  categories: readonly Category[],
  rootId: CategoryId,
): CategoryId[] {
  const childrenOf = (id: CategoryId): CategoryId[] =>
    categories
      .filter((c) => c.parentId === id)
      .flatMap((c) => [c.id, ...childrenOf(c.id)]);
  return childrenOf(rootId);
}
