// In-memory implementations of ReportStore, ReportTemplateStore, and ReportScheduleStore.
import { ok, err, newId } from "@veritas/core";
import type { ReportId, ReportSection, SectionId, TemplateId, ScheduleId, CreateReportInput, ReportStatus } from "./report.js";
import type {
  ReportStore,
  ReportPage,
  ReportListFilters,
  ReportTemplateStore,
  ReportTemplate,
  CreateReportTemplateInput,
  ReportScheduleStore,
  ReportSchedule,
  CreateReportScheduleInput,
  ReportResult,
} from "./types.js";
import type { Report } from "./report.js";
import { reportNotFound, templateNotFound, scheduleNotFound } from "./errors.js";

function nowIso(): string {
  return new Date().toISOString();
}

/** Thread-unsafe in-memory ReportStore suitable for tests and dev. */
export class InMemoryReportStore implements ReportStore {
  private readonly reports = new Map<string, Report>();
  private readonly sections = new Map<string, ReportSection[]>();

  async get(id: ReportId): ReportResult<Report> {
    const report = this.reports.get(id);
    if (!report) return err(reportNotFound(id));
    const secs = this.sections.get(id) ?? [];
    return ok({ ...report, sections: secs });
  }

  async list(filters: ReportListFilters): ReportResult<ReportPage> {
    const { organizationId, ownerId, status, format, page = 1, pageSize = 20 } = filters;
    let items = Array.from(this.reports.values());

    if (organizationId) items = items.filter((r) => r.organizationId === organizationId);
    if (ownerId) items = items.filter((r) => r.ownerId === ownerId);
    if (status) items = items.filter((r) => r.status === status);
    if (format) items = items.filter((r) => r.format === format);

    const total = items.length;
    const start = (page - 1) * pageSize;
    const sliced = items.slice(start, start + pageSize).map((r) => ({
      ...r,
      sections: this.sections.get(r.id) ?? [],
    }));

    return ok({ items: sliced, total, page, pageSize });
  }

  async create(input: CreateReportInput): ReportResult<Report> {
    const id = newId("Report");
    const now = nowIso();
    const report: Report = {
      id,
      title: input.title,
      description: input.description,
      status: "draft" as ReportStatus,
      format: input.format,
      templateId: input.templateId,
      ownerId: input.ownerId,
      organizationId: input.organizationId,
      parameters: input.parameters,
      sections: [],
      createdAt: now,
      updatedAt: now,
    };
    this.reports.set(id, report);
    return ok({ ...report, sections: [] });
  }

  async update(
    id: ReportId,
    patch: Partial<Omit<Report, "id" | "createdAt">>,
  ): ReportResult<Report> {
    const existing = this.reports.get(id);
    if (!existing) return err(reportNotFound(id));
    const updated: Report = { ...existing, ...patch, id, createdAt: existing.createdAt, updatedAt: nowIso() };
    this.reports.set(id, updated);
    return ok({ ...updated, sections: this.sections.get(id) ?? [] });
  }

  async remove(id: ReportId): ReportResult<void> {
    if (!this.reports.has(id)) return err(reportNotFound(id));
    this.reports.delete(id);
    this.sections.delete(id);
    return ok(undefined);
  }

  async addSection(section: ReportSection): ReportResult<ReportSection> {
    const { reportId } = section;
    if (!this.reports.has(reportId)) return err(reportNotFound(reportId));
    const existing = this.sections.get(reportId) ?? [];
    this.sections.set(reportId, [...existing, section]);
    return ok(section);
  }

  async removeSection(reportId: ReportId, sectionId: SectionId): ReportResult<void> {
    if (!this.reports.has(reportId)) return err(reportNotFound(reportId));
    const existing = this.sections.get(reportId) ?? [];
    const filtered = existing.filter((s) => s.id !== sectionId);
    this.sections.set(reportId, filtered);
    return ok(undefined);
  }
}

/** In-memory ReportTemplateStore. */
export class InMemoryReportTemplateStore implements ReportTemplateStore {
  private readonly templates = new Map<string, ReportTemplate>();

  async get(id: TemplateId): ReportResult<ReportTemplate> {
    const tpl = this.templates.get(id);
    if (!tpl) return err(templateNotFound(id));
    return ok(tpl);
  }

  async list(organizationId: string): ReportResult<readonly ReportTemplate[]> {
    const items = Array.from(this.templates.values()).filter(
      (t) => t.organizationId === organizationId,
    );
    return ok(items);
  }

  async create(input: CreateReportTemplateInput): ReportResult<ReportTemplate> {
    const id = newId("Template");
    const now = nowIso();
    const tpl: ReportTemplate = { ...input, id, createdAt: now, updatedAt: now };
    this.templates.set(id, tpl);
    return ok(tpl);
  }

  async remove(id: TemplateId): ReportResult<void> {
    if (!this.templates.has(id)) return err(templateNotFound(id));
    this.templates.delete(id);
    return ok(undefined);
  }
}

/** In-memory ReportScheduleStore. */
export class InMemoryReportScheduleStore implements ReportScheduleStore {
  private readonly schedules = new Map<string, ReportSchedule>();

  async get(id: ScheduleId): ReportResult<ReportSchedule> {
    const schedule = this.schedules.get(id);
    if (!schedule) return err(scheduleNotFound(id));
    return ok(schedule);
  }

  async list(organizationId: string): ReportResult<readonly ReportSchedule[]> {
    const items = Array.from(this.schedules.values()).filter(
      (s) => s.organizationId === organizationId,
    );
    return ok(items);
  }

  async create(input: CreateReportScheduleInput): ReportResult<ReportSchedule> {
    const id = newId("Schedule");
    const now = nowIso();
    const schedule: ReportSchedule = { ...input, id, createdAt: now, updatedAt: now };
    this.schedules.set(id, schedule);
    return ok(schedule);
  }

  async update(
    id: ScheduleId,
    patch: Partial<Omit<ReportSchedule, "id" | "createdAt">>,
  ): ReportResult<ReportSchedule> {
    const existing = this.schedules.get(id);
    if (!existing) return err(scheduleNotFound(id));
    const updated: ReportSchedule = { ...existing, ...patch, id, createdAt: existing.createdAt, updatedAt: nowIso() };
    this.schedules.set(id, updated);
    return ok(updated);
  }

  async remove(id: ScheduleId): ReportResult<void> {
    if (!this.schedules.has(id)) return err(scheduleNotFound(id));
    this.schedules.delete(id);
    return ok(undefined);
  }
}
