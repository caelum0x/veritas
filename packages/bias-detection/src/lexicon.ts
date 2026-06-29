// Loaded-term lexicon: curated lists of politically charged and loaded language patterns

export interface LexiconEntry {
  readonly term: string;
  readonly category: "political" | "emotional" | "loaded" | "euphemism" | "dysphemism";
  readonly direction: "left" | "right" | "neutral" | "both";
  readonly weight: number; // 0-1 severity
}

export interface Lexicon {
  readonly entries: ReadonlyArray<LexiconEntry>;
  readonly version: string;
}

const LOADED_TERMS: ReadonlyArray<LexiconEntry> = [
  // Political loaded terms
  { term: "radical", category: "loaded", direction: "right", weight: 0.7 },
  { term: "extremist", category: "loaded", direction: "both", weight: 0.8 },
  { term: "regime", category: "loaded", direction: "both", weight: 0.6 },
  { term: "propaganda", category: "loaded", direction: "both", weight: 0.8 },
  { term: "indoctrination", category: "loaded", direction: "both", weight: 0.8 },
  { term: "globalist", category: "political", direction: "right", weight: 0.7 },
  { term: "elites", category: "political", direction: "both", weight: 0.5 },
  { term: "establishment", category: "political", direction: "both", weight: 0.4 },
  { term: "deep state", category: "political", direction: "right", weight: 0.9 },
  { term: "woke", category: "political", direction: "right", weight: 0.7 },
  { term: "fascist", category: "loaded", direction: "left", weight: 0.9 },
  { term: "socialist", category: "political", direction: "right", weight: 0.5 },
  { term: "communist", category: "political", direction: "right", weight: 0.6 },
  { term: "far-right", category: "political", direction: "left", weight: 0.5 },
  { term: "far-left", category: "political", direction: "right", weight: 0.5 },
  // Emotional loaded terms
  { term: "catastrophic", category: "emotional", direction: "both", weight: 0.6 },
  { term: "devastating", category: "emotional", direction: "both", weight: 0.6 },
  { term: "disastrous", category: "emotional", direction: "both", weight: 0.6 },
  { term: "alarming", category: "emotional", direction: "both", weight: 0.5 },
  { term: "shocking", category: "emotional", direction: "both", weight: 0.4 },
  { term: "outrageous", category: "emotional", direction: "both", weight: 0.7 },
  { term: "horrifying", category: "emotional", direction: "both", weight: 0.7 },
  { term: "disgraceful", category: "emotional", direction: "both", weight: 0.7 },
  { term: "scandalous", category: "emotional", direction: "both", weight: 0.6 },
  { term: "despicable", category: "emotional", direction: "both", weight: 0.8 },
  // Euphemisms
  { term: "enhanced interrogation", category: "euphemism", direction: "right", weight: 0.9 },
  { term: "collateral damage", category: "euphemism", direction: "both", weight: 0.8 },
  { term: "downsizing", category: "euphemism", direction: "both", weight: 0.4 },
  { term: "ethnic cleansing", category: "euphemism", direction: "both", weight: 1.0 },
  { term: "pro-choice", category: "euphemism", direction: "left", weight: 0.5 },
  { term: "pro-life", category: "euphemism", direction: "right", weight: 0.5 },
  // Dysphemisms
  { term: "murder", category: "dysphemism", direction: "both", weight: 0.6 },
  { term: "invasion", category: "dysphemism", direction: "both", weight: 0.6 },
  { term: "thugs", category: "dysphemism", direction: "right", weight: 0.8 },
  { term: "illegals", category: "dysphemism", direction: "right", weight: 0.8 },
  { term: "mob", category: "dysphemism", direction: "both", weight: 0.5 },
];

/** Build the default loaded-term lexicon */
export function buildDefaultLexicon(): Lexicon {
  return { entries: LOADED_TERMS, version: "1.0.0" };
}

/** Match text against lexicon, returning all found entries with their positions */
export interface LexiconMatch {
  readonly entry: LexiconEntry;
  readonly matchedText: string;
  readonly startIndex: number;
  readonly endIndex: number;
}

export function matchLexicon(text: string, lexicon: Lexicon): ReadonlyArray<LexiconMatch> {
  const lower = text.toLowerCase();
  const matches: LexiconMatch[] = [];

  for (const entry of lexicon.entries) {
    const termLower = entry.term.toLowerCase();
    let searchFrom = 0;
    while (searchFrom < lower.length) {
      const idx = lower.indexOf(termLower, searchFrom);
      if (idx === -1) break;
      const before = idx === 0 ? " " : lower[idx - 1] ?? " ";
      const after = idx + termLower.length >= lower.length ? " " : lower[idx + termLower.length] ?? " ";
      const wordBoundaryBefore = /\W/.test(before);
      const wordBoundaryAfter = /\W/.test(after);
      if (wordBoundaryBefore && wordBoundaryAfter) {
        matches.push({
          entry,
          matchedText: text.slice(idx, idx + termLower.length),
          startIndex: idx,
          endIndex: idx + termLower.length,
        });
      }
      searchFrom = idx + 1;
    }
  }

  return matches;
}
