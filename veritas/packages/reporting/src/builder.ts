// Fluent builder for constructing Report instances incrementally before persistence.
import { newId } from "@veritas/core";
import type {
  Report,
  ReportId,
  ReportSection,
  SectionId,
  TemplateId,
  ReportFormat,
  SectionContent,
  SectionType,
  CreateReportInput,
} from "./report.js";

interface BuilderState {
  readonly id: ReportId;
  readonly title: string;
  readonly description: string;
  readonly format: ReportFormat;
  readonly templateId?: TemplateId;
  readonly ownerId: string;
  readonly organizationId: string;
  readonly parameters: Record<string, unknown>;
  readonly sections: readonly ReportSection[];
  readonly createdAt: string;
}

export class ReportBuilder {
  readonly #state: BuilderState;

  private constructor(state: BuilderState) {
    this.#state = state;
  }

  static create(input: CreateReportInput): ReportBuilder {
    const now = new Date().toISOString();
    return new ReportBuilder({
      id: newId("Report"),
      title: input.title,
      description: input.description,
      format: input.format,
      templateId: input.templateId,
      ownerId: input.ownerId,
      organizationId: input.organizationId,
      parameters: input.parameters,
      sections: [],
      createdAt: now,
    });
  }

  withTitle(title: string): ReportBuilder {
    return new ReportBuilder({ ...this.#state, title });
  }

  withDescription(description: string): ReportBuilder {
    return new ReportBuilder({ ...this.#state, description });
  }

  withFormat(format: ReportFormat): ReportBuilder {
    return new ReportBuilder({ ...this.#state, format });
  }

  withParameter(key: string, value: unknown): ReportBuilder {
    return new ReportBuilder({
      ...this.#state,
      parameters: { ...this.#state.parameters, [key]: value },
    });
  }

  withParameters(params: Record<string, unknown>): ReportBuilder {
    return new ReportBuilder({
      ...this.#state,
      parameters: { ...this.#state.parameters, ...params },
    });
  }

  addSection(type: SectionType, title: string, content: SectionContent): ReportBuilder {
    const now = new Date().toISOString();
    const section: ReportSection = {
      id: newId("Section") as SectionId,
      reportId: this.#state.id,
      type,
      title,
      order: this.#state.sections.length,
      content,
      createdAt: now,
    };
    return new ReportBuilder({
      ...this.#state,
      sections: [...this.#state.sections, section],
    });
  }

  reorderSections(ids: readonly SectionId[]): ReportBuilder {
    const byId = new Map(this.#state.sections.map((s) => [s.id, s]));
    const reordered = ids
      .map((id, order) => {
        const s = byId.get(id);
        return s ? { ...s, order } : null;
      })
      .filter((s): s is ReportSection => s !== null);
    return new ReportBuilder({ ...this.#state, sections: reordered });
  }

  build(): Report {
    const now = new Date().toISOString();
    return {
      id: this.#state.id,
      title: this.#state.title,
      description: this.#state.description,
      status: "draft",
      format: this.#state.format,
      templateId: this.#state.templateId,
      ownerId: this.#state.ownerId,
      organizationId: this.#state.organizationId,
      parameters: this.#state.parameters,
      sections: this.#state.sections,
      createdAt: this.#state.createdAt,
      updatedAt: now,
    };
  }
}
