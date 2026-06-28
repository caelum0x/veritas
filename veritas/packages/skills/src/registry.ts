// In-memory skill registry — maps skill ids to Skill + manifest pairs.
import { ok, err, type Result } from "@veritas/core";
import { type Skill } from "./skill.js";
import { type SkillManifest, buildManifest } from "./manifest.js";
import {
  SkillNotFoundError,
  SkillAlreadyRegisteredError,
} from "./errors.js";

interface RegistryEntry {
  readonly skill: Skill;
  readonly manifest: SkillManifest;
}

export interface SkillRegistry {
  register(skill: Skill): Result<SkillManifest, SkillAlreadyRegisteredError>;
  unregister(skillId: string): Result<true, SkillNotFoundError>;
  get(skillId: string): Result<Skill, SkillNotFoundError>;
  getManifest(skillId: string): Result<SkillManifest, SkillNotFoundError>;
  list(): readonly SkillManifest[];
  has(skillId: string): boolean;
}

/** Create a new isolated skill registry instance. */
export function createSkillRegistry(): SkillRegistry {
  const entries = new Map<string, RegistryEntry>();

  return {
    register(skill: Skill): Result<SkillManifest, SkillAlreadyRegisteredError> {
      const { id } = skill.definition;
      if (entries.has(id)) {
        return err(new SkillAlreadyRegisteredError(id));
      }
      const manifest = buildManifest(skill.definition, "built-in");
      entries.set(id, { skill, manifest });
      return ok(manifest);
    },

    unregister(skillId: string): Result<true, SkillNotFoundError> {
      if (!entries.has(skillId)) {
        return err(new SkillNotFoundError(skillId));
      }
      entries.delete(skillId);
      return ok(true as const);
    },

    get(skillId: string): Result<Skill, SkillNotFoundError> {
      const entry = entries.get(skillId);
      if (!entry) return err(new SkillNotFoundError(skillId));
      return ok(entry.skill);
    },

    getManifest(skillId: string): Result<SkillManifest, SkillNotFoundError> {
      const entry = entries.get(skillId);
      if (!entry) return err(new SkillNotFoundError(skillId));
      return ok(entry.manifest);
    },

    list(): readonly SkillManifest[] {
      return Array.from(entries.values()).map((e) => e.manifest);
    },

    has(skillId: string): boolean {
      return entries.has(skillId);
    },
  };
}

/** Singleton default registry for the process. */
export const defaultRegistry: SkillRegistry = createSkillRegistry();
