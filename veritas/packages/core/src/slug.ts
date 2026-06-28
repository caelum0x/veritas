// URL-safe slug generation from arbitrary text.

// Combining diacritical marks block (U+0300-U+036F) stripped after NFKD.
const DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g",
);

/** Convert text into a lowercase, hyphenated, URL-safe slug. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** True if `value` is already a valid slug (lowercase, hyphenated, non-empty). */
export function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** Slugify then truncate to `maxLength`, trimming a trailing hyphen. */
export function slugifyBounded(input: string, maxLength = 80): string {
  const slug = slugify(input).slice(0, maxLength);
  return slug.replace(/-+$/g, "");
}
