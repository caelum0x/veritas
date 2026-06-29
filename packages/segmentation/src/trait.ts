// User trait store — immutable snapshot of per-user key/value attributes.
import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { TraitMap, TraitMapSchema, TraitValue } from "./types.js";
import { InvalidRuleError } from "./errors.js";

export interface UserTraits {
  readonly userId: string;
  readonly traits: Readonly<TraitMap>;
}

const UserTraitsSchema = z.object({
  userId: z.string().min(1),
  traits: TraitMapSchema,
});

/** Parse and freeze a raw user-trait payload. */
export function parseUserTraits(raw: unknown): Result<UserTraits, InvalidRuleError> {
  const parsed = UserTraitsSchema.safeParse(raw);
  if (!parsed.success) {
    return err(new InvalidRuleError(parsed.error.issues[0]?.message ?? "invalid traits"));
  }
  return ok({ userId: parsed.data.userId, traits: Object.freeze({ ...parsed.data.traits }) });
}

/** Return the value of a single trait, or undefined if absent. */
export function getTrait(traits: UserTraits, key: string): TraitValue | undefined {
  return traits.traits[key];
}

/** Merge extra traits into a new UserTraits (immutable). */
export function mergeTrait(base: UserTraits, extra: TraitMap): UserTraits {
  return { userId: base.userId, traits: Object.freeze({ ...base.traits, ...extra }) };
}
