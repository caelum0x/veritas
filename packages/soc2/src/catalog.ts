// SOC2 trust-criteria catalog: AICPA TSC 2017 criteria definitions.

import { z } from "zod";
import { type TrustServiceCategory, TrustServiceCategorySchema } from "./control.js";

export const CriterionSeveritySchema = z.enum(["required", "recommended", "supplemental"]);
export type CriterionSeverity = z.infer<typeof CriterionSeveritySchema>;

export const CriterionSchema = z.object({
  ref: z.string().min(1),
  category: TrustServiceCategorySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  severity: CriterionSeveritySchema,
  pointsOfFocus: z.array(z.string()),
  relatedCriteria: z.array(z.string()).default([]),
});
export type Criterion = z.infer<typeof CriterionSchema>;

export const CatalogSchema = z.object({
  version: z.string().min(1),
  publishedAt: z.string().min(1),
  criteria: z.array(CriterionSchema),
});
export type Catalog = z.infer<typeof CatalogSchema>;

/** AICPA TSC 2017 common criteria (CC) and additional criteria. */
const CRITERIA: readonly Criterion[] = [
  {
    ref: "CC1.1",
    category: "security",
    title: "COSO Principle 1: Demonstrates Commitment to Integrity and Ethical Values",
    description:
      "The entity demonstrates a commitment to integrity and ethical values.",
    severity: "required",
    pointsOfFocus: [
      "Sets the Tone at the Top",
      "Establishes Standards of Conduct",
      "Evaluates Adherence to Standards of Conduct",
    ],
    relatedCriteria: ["CC1.2", "CC1.3"],
  },
  {
    ref: "CC1.2",
    category: "security",
    title: "COSO Principle 2: Exercises Oversight Responsibility",
    description:
      "The board of directors demonstrates independence from management and exercises oversight of controls.",
    severity: "required",
    pointsOfFocus: [
      "Establishes Oversight Responsibilities",
      "Applies Relevant Expertise",
      "Operates Independently",
    ],
    relatedCriteria: ["CC1.1"],
  },
  {
    ref: "CC2.1",
    category: "security",
    title: "COSO Principle 13: Uses Relevant Information",
    description:
      "The entity obtains or generates and uses relevant, quality information to support the functioning of internal control.",
    severity: "required",
    pointsOfFocus: [
      "Identifies Information Requirements",
      "Captures Internal and External Sources of Data",
      "Processes Relevant Data into Information",
    ],
    relatedCriteria: ["CC2.2", "CC2.3"],
  },
  {
    ref: "CC2.2",
    category: "security",
    title: "COSO Principle 14: Communicates Internally",
    description:
      "The entity internally communicates information, including objectives and responsibilities for internal control.",
    severity: "required",
    pointsOfFocus: [
      "Communicates Control Information",
      "Communicates with the Board of Directors",
      "Provides Separate Communication Lines",
    ],
    relatedCriteria: ["CC2.1"],
  },
  {
    ref: "CC6.1",
    category: "security",
    title: "Logical and Physical Access Controls",
    description:
      "The entity implements logical access security software, infrastructure, and architectures over protected information assets.",
    severity: "required",
    pointsOfFocus: [
      "Identifies and Manages the Inventory of Information Assets",
      "Restricts Logical Access",
      "Identifies and Authenticates Users",
      "Considers Network Segmentation",
    ],
    relatedCriteria: ["CC6.2", "CC6.3"],
  },
  {
    ref: "CC6.2",
    category: "security",
    title: "Prior to Issuing System Credentials",
    description:
      "Prior to issuing system credentials, the entity registers and authorizes new internal and external users.",
    severity: "required",
    pointsOfFocus: [
      "Controls Access Credentials to Protected Assets",
      "Removes Access to Protected Assets When Appropriate",
    ],
    relatedCriteria: ["CC6.1"],
  },
  {
    ref: "A1.1",
    category: "availability",
    title: "Capacity Planning",
    description:
      "The entity maintains, monitors, and evaluates current processing capacity and use of system components.",
    severity: "required",
    pointsOfFocus: [
      "Measures Current Usage",
      "Forecasts Capacity",
      "Makes Changes to Infrastructure Based on Forecasts",
    ],
    relatedCriteria: ["A1.2"],
  },
  {
    ref: "A1.2",
    category: "availability",
    title: "Environmental Threats",
    description:
      "The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental controls.",
    severity: "required",
    pointsOfFocus: [
      "Identifies Environmental Threats",
      "Designs Detection Measures",
      "Implements and Maintains Environmental Protection Mechanisms",
    ],
    relatedCriteria: ["A1.1"],
  },
  {
    ref: "PI1.1",
    category: "processing_integrity",
    title: "Processing Completeness",
    description:
      "The entity obtains or generates, uses, and communicates relevant, quality information to support the functioning of internal control.",
    severity: "required",
    pointsOfFocus: [
      "Defines Processing Activities",
      "Establishes Processing Performance Objectives",
      "Monitors Processing Completeness",
    ],
    relatedCriteria: [],
  },
  {
    ref: "C1.1",
    category: "confidentiality",
    title: "Identifies and Maintains Confidential Information",
    description:
      "The entity identifies and maintains confidential information to meet the entity's objectives.",
    severity: "required",
    pointsOfFocus: [
      "Identifies Confidential Information",
      "Protects Confidential Information During the System Development Life Cycle",
    ],
    relatedCriteria: ["C1.2"],
  },
  {
    ref: "C1.2",
    category: "confidentiality",
    title: "Disposes of Confidential Information",
    description:
      "The entity disposes of confidential information to meet the entity's objectives.",
    severity: "required",
    pointsOfFocus: [
      "Identifies Confidential Information for Destruction",
      "Destroys Confidential Information",
    ],
    relatedCriteria: ["C1.1"],
  },
  {
    ref: "P1.1",
    category: "privacy",
    title: "Privacy Notice",
    description:
      "The entity provides notice to data subjects about its privacy practices to meet the entity's objectives.",
    severity: "required",
    pointsOfFocus: [
      "Provides Notice Regarding Objectives",
      "Provides Notice Regarding Type of Personal Information Collected",
      "Provides Notice Regarding Choice and Consent",
    ],
    relatedCriteria: ["P2.1"],
  },
  {
    ref: "P2.1",
    category: "privacy",
    title: "Choice and Consent",
    description:
      "The entity communicates choices available and obtains implicit or explicit consent.",
    severity: "required",
    pointsOfFocus: [
      "Communicates to Data Subjects",
      "Obtains Implicit or Explicit Consent",
      "Documents and Obtains Consent for New Purposes and Uses",
    ],
    relatedCriteria: ["P1.1"],
  },
];

/** The built-in SOC2 TSC 2017 catalog. */
export const SOC2_CATALOG: Catalog = {
  version: "TSC-2017",
  publishedAt: "2017-01-01",
  criteria: [...CRITERIA],
};

/** Look up a criterion by its reference (e.g. "CC6.1"). */
export function getCriterion(ref: string): Criterion | undefined {
  return SOC2_CATALOG.criteria.find((c) => c.ref === ref);
}

/** Return all criteria for a given trust-service category. */
export function getCriteriaByCategory(category: TrustServiceCategory): readonly Criterion[] {
  return SOC2_CATALOG.criteria.filter((c) => c.category === category);
}

/** Return all required criteria across the catalog. */
export function getRequiredCriteria(): readonly Criterion[] {
  return SOC2_CATALOG.criteria.filter((c) => c.severity === "required");
}
