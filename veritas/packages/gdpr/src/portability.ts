// Data portability (GDPR Art. 20): export personal data in a structured, machine-readable format.
import { z } from "zod";
import { ok, err, type Result, InternalError } from "@veritas/core";
import { type Dsr } from "./dsr.js";
import { type PersonalDataEntry } from "./access-request.js";

export const portabilityFormatSchema = z.enum(["JSON", "CSV", "XML"]);
export type PortabilityFormat = z.infer<typeof portabilityFormatSchema>;

export const portabilityPackageSchema = z.object({
  dsrId: z.string(),
  subjectId: z.string(),
  subjectEmail: z.string().email(),
  format: portabilityFormatSchema,
  generatedAt: z.string(),
  filename: z.string(),
  content: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string(),
  expiresAt: z.string(),
});

export type PortabilityPackage = z.infer<typeof portabilityPackageSchema>;

export interface PortabilityDataProvider {
  fetchForSubject(subjectId: string): Promise<ReadonlyArray<PersonalDataEntry>>;
}

export interface PortabilitySerializer {
  readonly format: PortabilityFormat;
  readonly contentType: string;
  serialize(entries: ReadonlyArray<PersonalDataEntry>): string;
}

export interface PortabilityHandler {
  handlePortability(dsr: Dsr, format?: PortabilityFormat): Promise<Result<PortabilityPackage>>;
}

function simpleChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function makeJsonSerializer(): PortabilitySerializer {
  return {
    format: "JSON",
    contentType: "application/json",
    serialize(entries: ReadonlyArray<PersonalDataEntry>): string {
      return JSON.stringify(
        { exportedAt: new Date().toISOString(), records: entries },
        null,
        2,
      );
    },
  };
}

function makeCsvSerializer(): PortabilitySerializer {
  return {
    format: "CSV",
    contentType: "text/csv",
    serialize(entries: ReadonlyArray<PersonalDataEntry>): string {
      const headers = ["category", "source", "field", "value", "collectedAt", "lawfulBasis", "retentionUntil"];
      const rows = entries.map((e) =>
        [
          e.category,
          e.source,
          e.field,
          String(e.value ?? ""),
          e.collectedAt,
          e.lawfulBasis,
          e.retentionUntil ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
      return [headers.join(","), ...rows].join("\n");
    },
  };
}

function makeXmlSerializer(): PortabilitySerializer {
  return {
    format: "XML",
    contentType: "application/xml",
    serialize(entries: ReadonlyArray<PersonalDataEntry>): string {
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const records = entries
        .map(
          (e) =>
            `  <record>\n    <category>${esc(e.category)}</category>\n    <source>${esc(e.source)}</source>\n    <field>${esc(e.field)}</field>\n    <value>${esc(String(e.value ?? ""))}</value>\n    <collectedAt>${esc(e.collectedAt)}</collectedAt>\n    <lawfulBasis>${esc(e.lawfulBasis)}</lawfulBasis>\n    <retentionUntil>${esc(e.retentionUntil ?? "")}</retentionUntil>\n  </record>`,
        )
        .join("\n");
      return `<?xml version="1.0" encoding="UTF-8"?>\n<export generatedAt="${new Date().toISOString()}">\n${records}\n</export>`;
    },
  };
}

const SERIALIZERS: Record<PortabilityFormat, PortabilitySerializer> = {
  JSON: makeJsonSerializer(),
  CSV: makeCsvSerializer(),
  XML: makeXmlSerializer(),
};

export function makePortabilityHandler(
  provider: PortabilityDataProvider,
): PortabilityHandler {
  return {
    async handlePortability(dsr: Dsr, format: PortabilityFormat = "JSON"): Promise<Result<PortabilityPackage>> {
      if (dsr.type !== "PORTABILITY") {
        return err(new InternalError({ message: "DSR type mismatch: expected PORTABILITY" }));
      }

      let entries: ReadonlyArray<PersonalDataEntry>;
      try {
        entries = await provider.fetchForSubject(dsr.subjectId);
      } catch (e) {
        return err(new InternalError({ message: "Failed to fetch personal data for portability", cause: e }));
      }

      const serializer = SERIALIZERS[format];
      const content = serializer.serialize(entries);
      const sizeBytes = Buffer.byteLength(content, "utf8");
      const checksum = simpleChecksum(content);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const ext = format.toLowerCase();
      const filename = `gdpr-export-${dsr.subjectId}-${now.getTime()}.${ext}`;

      const pkg: PortabilityPackage = Object.freeze({
        dsrId: dsr.id,
        subjectId: dsr.subjectId,
        subjectEmail: dsr.subjectEmail,
        format,
        generatedAt: now.toISOString(),
        filename,
        content,
        contentType: serializer.contentType,
        sizeBytes,
        checksum,
        expiresAt,
      });

      return ok(pkg);
    },
  };
}
