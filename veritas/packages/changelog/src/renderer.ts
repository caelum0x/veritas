// Renders changelog entries to markdown, HTML, or JSON string output.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { ChangeEntry } from "./entry.js";
import type { VersionedChangelog } from "./version.js";
import type { RenderOptions } from "./types.js";
import { CATEGORY_LABELS, CATEGORY_EMOJI } from "./category.js";
import { ChangelogRenderError } from "./errors.js";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatIssueRef(ref: string, baseUrl?: string): string {
  if (baseUrl) return `[${ref}](${baseUrl}/${ref})`;
  return ref;
}

function formatPrRef(ref: string, baseUrl?: string): string {
  if (baseUrl) return `[${ref}](${baseUrl}/${ref})`;
  return ref;
}

function renderEntryMarkdown(entry: ChangeEntry, opts: RenderOptions): string {
  const lines: string[] = [];
  const emoji = CATEGORY_EMOJI[entry.category];
  const label = CATEGORY_LABELS[entry.category];
  lines.push(`- **[${emoji} ${label}]** ${entry.title}`);
  if (entry.description) lines.push(`  ${entry.description}`);
  if (opts.includeBreakingNotices && entry.breakingChange) {
    lines.push(`  > **BREAKING CHANGE**`);
  }
  if (opts.includeIssueRefs && entry.issueRefs.length > 0) {
    const refs = entry.issueRefs.map((r) => formatIssueRef(r, opts.baseIssueUrl)).join(", ");
    lines.push(`  Issues: ${refs}`);
  }
  if (opts.includePrRefs && entry.prRefs.length > 0) {
    const refs = entry.prRefs.map((r) => formatPrRef(r, opts.basePrUrl)).join(", ");
    lines.push(`  PRs: ${refs}`);
  }
  return lines.join("\n");
}

function renderVersionMarkdown(vc: VersionedChangelog, opts: RenderOptions): string {
  const lines: string[] = [];
  const yankNotice = vc.yanked ? ` [YANKED${vc.yankedReason ? `: ${vc.yankedReason}` : ""}]` : "";
  lines.push(`## [${vc.version}]${yankNotice} - ${vc.releasedAt.slice(0, 10)}`);
  if (vc.summary) lines.push(`\n${vc.summary}`);
  const entries = opts.maxEntriesPerVersion ? vc.entries.slice(0, opts.maxEntriesPerVersion) : vc.entries;
  for (const entry of entries) {
    lines.push(renderEntryMarkdown(entry, opts));
  }
  return lines.join("\n");
}

function renderVersionHtml(vc: VersionedChangelog, opts: RenderOptions): string {
  const lines: string[] = [];
  lines.push(`<section class="changelog-version">`);
  const yankNotice = vc.yanked
    ? ` <span class="yanked">YANKED${vc.yankedReason ? `: ${escapeHtml(vc.yankedReason)}` : ""}</span>`
    : "";
  lines.push(`  <h2>${escapeHtml(vc.version)}${yankNotice} <small>${vc.releasedAt.slice(0, 10)}</small></h2>`);
  if (vc.summary) lines.push(`  <p>${escapeHtml(vc.summary)}</p>`);
  lines.push(`  <ul>`);
  const entries = opts.maxEntriesPerVersion ? vc.entries.slice(0, opts.maxEntriesPerVersion) : vc.entries;
  for (const entry of entries) {
    const label = CATEGORY_LABELS[entry.category];
    lines.push(`    <li>`);
    lines.push(`      <span class="category">${escapeHtml(label)}</span>`);
    lines.push(`      <strong>${escapeHtml(entry.title)}</strong>`);
    if (entry.description) lines.push(`      <p>${escapeHtml(entry.description)}</p>`);
    if (opts.includeBreakingNotices && entry.breakingChange) {
      lines.push(`      <span class="breaking">BREAKING CHANGE</span>`);
    }
    lines.push(`    </li>`);
  }
  lines.push(`  </ul>`);
  lines.push(`</section>`);
  return lines.join("\n");
}

export function renderVersionedChangelog(
  versions: readonly VersionedChangelog[],
  opts: RenderOptions
): Result<string, ChangelogRenderError> {
  try {
    if (opts.format === "json") {
      return ok(JSON.stringify(versions, null, 2));
    }
    if (opts.format === "markdown") {
      const body = versions.map((v) => renderVersionMarkdown(v, opts)).join("\n\n");
      return ok(`# Changelog\n\n${body}`);
    }
    if (opts.format === "html") {
      const body = versions.map((v) => renderVersionHtml(v, opts)).join("\n");
      return ok(`<article class="changelog">\n${body}\n</article>`);
    }
    return err(new ChangelogRenderError(opts.format, "unsupported format"));
  } catch (cause) {
    return err(new ChangelogRenderError(opts.format, cause));
  }
}

export function renderSingleEntry(
  entry: ChangeEntry,
  opts: RenderOptions
): Result<string, ChangelogRenderError> {
  try {
    if (opts.format === "json") return ok(JSON.stringify(entry, null, 2));
    if (opts.format === "markdown") return ok(renderEntryMarkdown(entry, opts));
    if (opts.format === "html") {
      const label = CATEGORY_LABELS[entry.category];
      return ok(
        `<li><span class="category">${escapeHtml(label)}</span> <strong>${escapeHtml(entry.title)}</strong></li>`
      );
    }
    return err(new ChangelogRenderError(opts.format, "unsupported format for single entry"));
  } catch (cause) {
    return err(new ChangelogRenderError(opts.format, cause));
  }
}
