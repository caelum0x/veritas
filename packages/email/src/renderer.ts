// Template renderer — resolves named templates and produces text/html email content

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { EmailTemplate } from "./template.js";
import { emailTemplateNotFound, emailRenderFailed, EmailError } from "./errors.js";

export interface RenderedContent {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export interface EmailRenderer {
  render(
    templateName: string,
    context: Record<string, unknown>
  ): Promise<Result<RenderedContent, EmailError>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(name: string, template: EmailTemplate<any>): void;
}

export class TemplateRegistry implements EmailRenderer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly #templates = new Map<string, EmailTemplate<any>>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(name: string, template: EmailTemplate<any>): void {
    this.#templates.set(name, template);
  }

  async render(
    templateName: string,
    context: Record<string, unknown>
  ): Promise<Result<RenderedContent, EmailError>> {
    const template = this.#templates.get(templateName);
    if (!template) {
      return err(emailTemplateNotFound(templateName));
    }

    try {
      const rendered: RenderedContent = {
        subject: template.subject(context),
        html: template.html(context),
        text: template.text(context),
      };
      return ok(rendered);
    } catch (cause) {
      return err(emailRenderFailed(templateName, cause));
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createRenderer(templates?: ReadonlyMap<string, EmailTemplate<any>>): EmailRenderer {
  const registry = new TemplateRegistry();
  if (templates) {
    for (const [name, template] of templates) {
      registry.register(name, template);
    }
  }
  return registry;
}
