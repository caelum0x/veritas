// Skill loader — resolves a Skill from the registry or a dynamic path.
import { ok, err, tryAsync, type Result } from "@veritas/core";
import { type Skill } from "./skill.js";
import { type SkillRegistry, defaultRegistry } from "./registry.js";
import { buildManifest } from "./manifest.js";
import { SkillNotFoundError, SkillInvocationError } from "./errors.js";

export interface LoadOptions {
  /** Override the registry to use (defaults to defaultRegistry). */
  registry?: SkillRegistry;
  /**
   * If provided and no registry hit, attempt a dynamic ESM import from this
   * absolute path.  The module must have a default export of type Skill.
   */
  dynamicPath?: string;
}

/** Load a skill by id, optionally falling back to a dynamic import. */
export async function loadSkill(
  skillId: string,
  options: LoadOptions = {},
): Promise<Result<Skill, SkillNotFoundError | SkillInvocationError>> {
  const registry = options.registry ?? defaultRegistry;

  // Fast path — skill already registered.
  const registryResult = registry.get(skillId);
  if (registryResult.ok) return ok(registryResult.value);

  // Dynamic import fallback.
  if (!options.dynamicPath) {
    return err(new SkillNotFoundError(skillId));
  }

  const importResult = await tryAsync(() =>
    import(options.dynamicPath as string),
  );

  if (!importResult.ok) {
    return err(
      new SkillInvocationError(
        skillId,
        importResult.error,
      ),
    );
  }

  const mod = importResult.value as Record<string, unknown>;
  const skill = mod["default"] as Skill | undefined;

  if (
    !skill ||
    typeof skill !== "object" ||
    !("definition" in skill) ||
    !("handler" in skill)
  ) {
    return err(
      new SkillInvocationError(
        skillId,
        new Error(
          `Dynamic module at '${options.dynamicPath}' did not export a valid Skill as default`,
        ),
      ),
    );
  }

  // Register for future lookups, attach manifest with source "loaded".
  const manifest = buildManifest(skill.definition, "loaded", options.dynamicPath);
  registry.register(skill);

  return ok(skill);
}
