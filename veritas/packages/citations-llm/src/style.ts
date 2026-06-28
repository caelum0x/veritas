// Citation styles: APA, MLA, Chicago, inline, and numeric reference formats.

export type CitationStyleId = "apa" | "mla" | "chicago" | "inline" | "numeric";

export interface CitationStyleMeta {
  id: CitationStyleId;
  label: string;
  description: string;
}

export const CITATION_STYLES: Record<CitationStyleId, CitationStyleMeta> = {
  apa: {
    id: "apa",
    label: "APA 7th",
    description: "Author-date format used in social sciences.",
  },
  mla: {
    id: "mla",
    label: "MLA 9th",
    description: "Works-cited format used in humanities.",
  },
  chicago: {
    id: "chicago",
    label: "Chicago 17th",
    description: "Notes-bibliography format used in history.",
  },
  inline: {
    id: "inline",
    label: "Inline URL",
    description: "Bare hyperlink embedded in text.",
  },
  numeric: {
    id: "numeric",
    label: "Numeric",
    description: "Numbered reference list [1], [2], …",
  },
};

/** Resolve a CitationStyleMeta by id, falling back to inline. */
export function resolveStyle(id: string | undefined): CitationStyleMeta {
  if (id && Object.prototype.hasOwnProperty.call(CITATION_STYLES, id)) {
    return CITATION_STYLES[id as CitationStyleId];
  }
  return CITATION_STYLES.inline;
}

/** Return all registered style ids. */
export function listStyleIds(): CitationStyleId[] {
  return Object.keys(CITATION_STYLES) as CitationStyleId[];
}
