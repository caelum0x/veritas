// Typecheck the monorepo as independent programs: the packages as one program,
// and each app on its own. Apps must be isolated because several globally
// augment `Express.Request` with mutually-incompatible types; compiling them
// together (as the root tsconfig does) merges those augmentations and produces
// ~1000 phantom errors that do not exist when each app is built on its own.
//
// Usage:
//   node scripts/typecheck-all.mjs            # packages + every app
//   node scripts/typecheck-all.mjs growth-api # one app (substring match)
//   node scripts/typecheck-all.mjs --apps     # apps only
//   node scripts/typecheck-all.mjs --packages # packages only
import { readdirSync, existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const filter = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));

/** Run `tsc -p <project>` and return the error count from its output. */
function typecheck(label, project) {
  const result = spawnSync("npx", ["tsc", "-p", project, "--noEmit"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const count = (out.match(/error TS\d+/g) ?? []).length;
  const status = count === 0 ? "OK " : `${count} err`;
  console.log(`  [${status.padStart(7)}]  ${label}`);
  return { label, count, out };
}

const targets = [];
if (!flags.has("--apps")) {
  targets.push({ label: "packages", project: "tsconfig.packages.json" });
}
if (!flags.has("--packages")) {
  for (const name of readdirSync(join(ROOT, "apps")).sort()) {
    const dir = join(ROOT, "apps", name);
    if (!statSync(dir).isDirectory()) continue;
    if (!existsSync(join(dir, "tsconfig.json"))) continue;
    if (filter.length > 0 && !filter.some((f) => name.includes(f))) continue;
    targets.push({ label: `apps/${name}`, project: `apps/${name}/tsconfig.json` });
  }
}

console.log(`Typechecking ${targets.length} project(s)...\n`);
const results = targets.map((t) => typecheck(t.label, t.project));
const failed = results.filter((r) => r.count > 0);
const total = results.reduce((sum, r) => sum + r.count, 0);

if (failed.length > 0) {
  console.log(`\nFailing projects (${failed.length}):`);
  for (const r of failed.sort((a, b) => b.count - a.count)) {
    console.log(`  ${String(r.count).padStart(4)}  ${r.label}`);
  }
}
console.log(`\nTotal errors: ${total}`);
process.exit(total === 0 ? 0 : 1);
