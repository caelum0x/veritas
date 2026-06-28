// @veritas/skills public surface re-export.
export * from "./types.js";
export * from "./errors.js";
export * from "./skill.js";
export * from "./manifest.js";
export * from "./registry.js";
export * from "./loader.js";

// Built-in skill library
export { factCheckSkill } from "./library/fact-check.skill.js";
export { sourceVetSkill } from "./library/source-vet.skill.js";
