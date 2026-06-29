// Generates RSS and Atom feed strings from versioned changelog data.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { VersionedChangelog } from "./version.js";
import type { FeedMeta, FeedFormat } from "./types.js";
import { ChangelogFeedError } from "./errors.js";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfcDate(iso: string): string {
  return new Date(iso).toUTCString();
}

function atomDate(iso: string): string {
  return new Date(iso).toISOString();
}

function buildRssItem(vc: VersionedChangelog, meta: FeedMeta): string {
  const title = `Version ${vc.version}${vc.yanked ? " [YANKED]" : ""}`;
  const desc = vc.summary ?? `Release ${vc.version} — ${vc.entries.length} change(s).`;
  const link = `${meta.link}/changelog/${vc.version}`;
  return [
    `    <item>`,
    `      <title>${escapeXml(title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `      <pubDate>${rfcDate(vc.releasedAt)}</pubDate>`,
    `      <description>${escapeXml(desc)}</description>`,
    `    </item>`,
  ].join("\n");
}

function buildAtomEntry(vc: VersionedChangelog, meta: FeedMeta): string {
  const title = `Version ${vc.version}${vc.yanked ? " [YANKED]" : ""}`;
  const desc = vc.summary ?? `Release ${vc.version} — ${vc.entries.length} change(s).`;
  const link = `${meta.link}/changelog/${vc.version}`;
  return [
    `    <entry>`,
    `      <title>${escapeXml(title)}</title>`,
    `      <link href="${escapeXml(link)}"/>`,
    `      <id>${escapeXml(link)}</id>`,
    `      <updated>${atomDate(vc.releasedAt)}</updated>`,
    `      <summary>${escapeXml(desc)}</summary>`,
    `    </entry>`,
  ].join("\n");
}

export function generateRssFeed(
  versions: readonly VersionedChangelog[],
  meta: FeedMeta
): Result<string, ChangelogFeedError> {
  try {
    const items = versions.map((v) => buildRssItem(v, meta)).join("\n");
    const lastBuild = versions.length > 0 ? rfcDate(versions[0]!.releasedAt) : rfcDate(new Date().toISOString());
    const lines = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
      `  <channel>`,
      `    <title>${escapeXml(meta.title)}</title>`,
      `    <link>${escapeXml(meta.link)}</link>`,
      `    <description>${escapeXml(meta.description)}</description>`,
      `    <language>${escapeXml(meta.language)}</language>`,
      `    <lastBuildDate>${lastBuild}</lastBuildDate>`,
      `    <atom:link href="${escapeXml(meta.feedLink)}" rel="self" type="application/rss+xml"/>`,
      meta.copyright ? `    <copyright>${escapeXml(meta.copyright)}</copyright>` : "",
      meta.managingEditor ? `    <managingEditor>${escapeXml(meta.managingEditor)}</managingEditor>` : "",
      meta.ttl ? `    <ttl>${meta.ttl}</ttl>` : "",
      items,
      `  </channel>`,
      `</rss>`,
    ].filter((l) => l !== "");
    return ok(lines.join("\n"));
  } catch (cause) {
    return err(new ChangelogFeedError("rss", cause));
  }
}

export function generateAtomFeed(
  versions: readonly VersionedChangelog[],
  meta: FeedMeta
): Result<string, ChangelogFeedError> {
  try {
    const entries = versions.map((v) => buildAtomEntry(v, meta)).join("\n");
    const updated =
      versions.length > 0 ? atomDate(versions[0]!.releasedAt) : new Date().toISOString();
    const lines = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<feed xmlns="http://www.w3.org/2005/Atom">`,
      `  <title>${escapeXml(meta.title)}</title>`,
      `  <link href="${escapeXml(meta.link)}"/>`,
      `  <link href="${escapeXml(meta.feedLink)}" rel="self"/>`,
      `  <id>${escapeXml(meta.link)}</id>`,
      `  <updated>${updated}</updated>`,
      `  <subtitle>${escapeXml(meta.description)}</subtitle>`,
      meta.copyright ? `  <rights>${escapeXml(meta.copyright)}</rights>` : "",
      entries,
      `</feed>`,
    ].filter((l) => l !== "");
    return ok(lines.join("\n"));
  } catch (cause) {
    return err(new ChangelogFeedError("atom", cause));
  }
}

export function generateFeed(
  versions: readonly VersionedChangelog[],
  meta: FeedMeta,
  format: FeedFormat
): Result<string, ChangelogFeedError> {
  if (format === "rss") return generateRssFeed(versions, meta);
  if (format === "atom") return generateAtomFeed(versions, meta);
  return err(new ChangelogFeedError(format, "unsupported feed format"));
}
