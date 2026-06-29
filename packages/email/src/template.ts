// Email template type defining structure for all email templates

export interface EmailTemplate<T extends object = Record<string, unknown>> {
  readonly name: string;
  readonly subject: (data: T) => string;
  readonly html: (data: T) => string;
  readonly text: (data: T) => string;
}
