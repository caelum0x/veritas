// Domain enum representing the subject-matter area of a verifiable claim.
export enum Domain {
  Financial = "financial",
  Scientific = "scientific",
  Medical = "medical",
  News = "news",
  Crypto = "crypto",
  Legal = "legal",
  General = "general",
}

export const DOMAINS = Object.values(Domain) as Domain[];

export function isDomain(value: unknown): value is Domain {
  return typeof value === "string" && DOMAINS.includes(value as Domain);
}
