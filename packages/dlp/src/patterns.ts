// PII regex patterns for email, SSN, credit card, phone, and other sensitive data.

export interface PiiPattern {
  readonly name: string;
  readonly regex: RegExp;
  readonly category: "email" | "ssn" | "card" | "phone" | "ip" | "passport" | "iban";
}

export const PII_PATTERNS: readonly PiiPattern[] = Object.freeze([
  {
    name: "email",
    category: "email",
    regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    name: "ssn",
    category: "ssn",
    regex: /\b(?!000|666|9\d{2})\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}\b/g,
  },
  {
    name: "credit_card",
    category: "card",
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,
  },
  {
    name: "phone_us",
    category: "phone",
    regex: /\b(?:\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g,
  },
  {
    name: "phone_intl",
    category: "phone",
    regex: /\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{1,4}[\s.\-]?\d{1,9}/g,
  },
  {
    name: "ipv4",
    category: "ip",
    regex: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
  },
  {
    name: "passport_us",
    category: "passport",
    regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
  },
  {
    name: "iban",
    category: "iban",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]?){0,16}\b/g,
  },
]);
