// Extraction prompts — pull structured claims and entities from raw text.
import { definePrompt } from "../prompt.js";
import type { PromptTemplate } from "../prompt.js";

export const claimExtractionPrompt: PromptTemplate = definePrompt({
  meta: {
    id: "extraction.claims",
    name: "Extract Claims",
    description:
      "Extracts discrete, verifiable factual claims from a block of text.",
    category: "extraction",
    tags: ["claims", "nlp", "extraction"],
    version: "1.0.0",
  },
  variables: [
    {
      name: "text",
      description: "The source text to extract claims from.",
      required: true,
    },
    {
      name: "maxClaims",
      description: "Maximum number of claims to extract.",
      required: false,
      defaultValue: "20",
    },
    {
      name: "minConfidence",
      description: "Minimum extraction confidence threshold (0–1).",
      required: false,
      defaultValue: "0.5",
    },
  ],
  messages: [
    {
      role: "system",
      content: `You are a claim-extraction specialist. Your task is to identify discrete, verifiable factual claims from the provided text.

A verifiable claim must:
- Assert a specific, falsifiable fact about the world.
- Be self-contained (understandable without additional context).
- Not be an opinion, prediction, or normative statement.

Respond with a JSON array (no wrapper object) where each element matches:
{
  "text": "<verbatim or minimally paraphrased claim>",
  "startOffset": <character offset in source text, or -1 if unknown>,
  "endOffset": <character offset in source text, or -1 if unknown>,
  "confidence": <extraction confidence between 0 and 1>,
  "entities": ["<named entity>", ...]
}

Return at most {{maxClaims}} claims with confidence >= {{minConfidence}}.
Return valid JSON array and nothing else.`,
    },
    {
      role: "user",
      content: `Extract verifiable claims from the following text:\n\n{{text}}`,
    },
  ],
  partials: [],
});

export const entityExtractionPrompt: PromptTemplate = definePrompt({
  meta: {
    id: "extraction.entities",
    name: "Extract Entities",
    description:
      "Identifies named entities and their types from source text.",
    category: "extraction",
    tags: ["entities", "ner", "extraction"],
    version: "1.0.0",
  },
  variables: [
    {
      name: "text",
      description: "The source text to extract entities from.",
      required: true,
    },
    {
      name: "entityTypes",
      description:
        "Comma-separated list of entity types to focus on (e.g. PERSON,ORG,DATE).",
      required: false,
      defaultValue: "PERSON,ORG,LOCATION,DATE,EVENT,PRODUCT,LAW",
    },
  ],
  messages: [
    {
      role: "system",
      content: `You are a named-entity recognition specialist. Extract entities of these types: {{entityTypes}}.

Respond with a JSON array where each element matches:
{
  "text": "<entity surface form>",
  "type": "<entity type>",
  "startOffset": <character offset or -1>,
  "endOffset": <character offset or -1>,
  "confidence": <number between 0 and 1>,
  "canonicalName": "<normalized canonical name if known, else same as text>"
}

Return valid JSON array and nothing else.`,
    },
    {
      role: "user",
      content: `Extract entities from the following text:\n\n{{text}}`,
    },
  ],
  partials: [],
});

export const citationExtractionPrompt: PromptTemplate = definePrompt({
  meta: {
    id: "extraction.citations",
    name: "Extract Citations",
    description:
      "Extracts source citations and references from text, normalizing URLs and publication metadata.",
    category: "extraction",
    tags: ["citations", "sources", "extraction"],
    version: "1.0.0",
  },
  variables: [
    {
      name: "text",
      description: "The source text containing citations.",
      required: true,
    },
  ],
  messages: [
    {
      role: "system",
      content: `You are a citation-extraction specialist. Identify all source citations, references, and links in the provided text.

Respond with a JSON array where each element matches:
{
  "rawText": "<original citation text as found>",
  "url": "<URL if present, else null>",
  "title": "<publication title if found, else null>",
  "authors": ["<author name>", ...],
  "publishedDate": "<ISO date string if found, else null>",
  "publisher": "<publisher/outlet name if found, else null>",
  "confidence": <extraction confidence between 0 and 1>
}

Return valid JSON array and nothing else.`,
    },
    {
      role: "user",
      content: `Extract citations from the following text:\n\n{{text}}`,
    },
  ],
  partials: [],
});
