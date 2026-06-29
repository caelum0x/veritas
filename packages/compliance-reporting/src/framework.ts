// Compliance framework definitions for SOC2, ISO 27001, and GDPR with requirement catalogs.

import { z } from "zod";

export const FrameworkIdSchema = z.enum([
  "soc2_type1",
  "soc2_type2",
  "iso27001",
  "gdpr",
  "nist_csf",
  "hipaa",
  "pci_dss",
]);
export type FrameworkId = z.infer<typeof FrameworkIdSchema>;

export const RequirementCategorySchema = z.enum([
  "access_control",
  "data_protection",
  "incident_response",
  "risk_management",
  "audit_logging",
  "change_management",
  "vendor_management",
  "business_continuity",
  "cryptography",
  "physical_security",
  "privacy",
  "monitoring",
]);
export type RequirementCategory = z.infer<typeof RequirementCategorySchema>;

export const RequirementSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: RequirementCategorySchema,
  mandatory: z.boolean(),
  guidance: z.string().optional(),
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const ComplianceFrameworkSchema = z.object({
  id: FrameworkIdSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  issuer: z.string().min(1),
  requirements: z.array(RequirementSchema),
  tags: z.array(z.string()).default([]),
});
export type ComplianceFramework = z.infer<typeof ComplianceFrameworkSchema>;

// --- SOC2 Type II Framework ---

const SOC2_REQUIREMENTS: Requirement[] = [
  {
    id: "soc2-cc1",
    code: "CC1",
    title: "Control Environment",
    description: "The entity demonstrates a commitment to integrity and ethical values.",
    category: "risk_management",
    mandatory: true,
    guidance: "Policies, organizational structure, and oversight responsibilities.",
  },
  {
    id: "soc2-cc2",
    code: "CC2",
    title: "Communication and Information",
    description: "The entity obtains and uses relevant, quality information to support internal controls.",
    category: "monitoring",
    mandatory: true,
    guidance: "Internal and external communication channels and information quality.",
  },
  {
    id: "soc2-cc3",
    code: "CC3",
    title: "Risk Assessment",
    description: "The entity specifies objectives with sufficient clarity to identify risks.",
    category: "risk_management",
    mandatory: true,
    guidance: "Risk identification, analysis, and fraud risk assessment.",
  },
  {
    id: "soc2-cc4",
    code: "CC4",
    title: "Monitoring of Controls",
    description: "The entity selects, develops, and performs ongoing evaluations.",
    category: "monitoring",
    mandatory: true,
  },
  {
    id: "soc2-cc5",
    code: "CC5",
    title: "Control Activities",
    description: "The entity selects and develops control activities that mitigate risks.",
    category: "risk_management",
    mandatory: true,
  },
  {
    id: "soc2-cc6",
    code: "CC6",
    title: "Logical and Physical Access Controls",
    description: "The entity implements logical and physical access controls.",
    category: "access_control",
    mandatory: true,
    guidance: "Authentication, authorization, and physical access restrictions.",
  },
  {
    id: "soc2-cc7",
    code: "CC7",
    title: "System Operations",
    description: "The entity detects and monitors for new vulnerabilities and threats.",
    category: "monitoring",
    mandatory: true,
  },
  {
    id: "soc2-cc8",
    code: "CC8",
    title: "Change Management",
    description: "The entity authorizes, designs, develops, tests, and approves changes.",
    category: "change_management",
    mandatory: true,
  },
  {
    id: "soc2-cc9",
    code: "CC9",
    title: "Risk Mitigation",
    description: "The entity identifies and manages vendor and business partner risks.",
    category: "vendor_management",
    mandatory: true,
  },
  {
    id: "soc2-a1",
    code: "A1",
    title: "Availability",
    description: "The entity's system is available for operation and use as committed.",
    category: "business_continuity",
    mandatory: false,
    guidance: "Uptime SLAs, disaster recovery, and capacity management.",
  },
  {
    id: "soc2-c1",
    code: "C1",
    title: "Confidentiality",
    description: "Information designated as confidential is protected as committed.",
    category: "data_protection",
    mandatory: false,
  },
  {
    id: "soc2-p1",
    code: "P1",
    title: "Privacy — Notice and Communication",
    description: "The entity provides notice about its privacy practices.",
    category: "privacy",
    mandatory: false,
  },
];

export const SOC2_TYPE2_FRAMEWORK: ComplianceFramework = {
  id: "soc2_type2",
  name: "SOC 2 Type II",
  version: "2017",
  description: "AICPA Trust Services Criteria — operating effectiveness over a period.",
  issuer: "AICPA",
  requirements: SOC2_REQUIREMENTS,
  tags: ["audit", "security", "trust-services"],
};

export const SOC2_TYPE1_FRAMEWORK: ComplianceFramework = {
  ...SOC2_TYPE2_FRAMEWORK,
  id: "soc2_type1",
  name: "SOC 2 Type I",
  description: "AICPA Trust Services Criteria — design adequacy at a point in time.",
};

// --- ISO 27001 Framework ---

const ISO27001_REQUIREMENTS: Requirement[] = [
  {
    id: "iso-a5",
    code: "A.5",
    title: "Information Security Policies",
    description: "Management direction and support for information security.",
    category: "risk_management",
    mandatory: true,
  },
  {
    id: "iso-a6",
    code: "A.6",
    title: "Organisation of Information Security",
    description: "Internal organisation and mobile devices/teleworking.",
    category: "risk_management",
    mandatory: true,
  },
  {
    id: "iso-a7",
    code: "A.7",
    title: "Human Resource Security",
    description: "Security before, during, and after employment.",
    category: "access_control",
    mandatory: true,
  },
  {
    id: "iso-a8",
    code: "A.8",
    title: "Asset Management",
    description: "Responsibility for assets and information classification.",
    category: "data_protection",
    mandatory: true,
  },
  {
    id: "iso-a9",
    code: "A.9",
    title: "Access Control",
    description: "Business requirements, user access management, and system access.",
    category: "access_control",
    mandatory: true,
  },
  {
    id: "iso-a10",
    code: "A.10",
    title: "Cryptography",
    description: "Cryptographic controls and key management.",
    category: "cryptography",
    mandatory: true,
  },
  {
    id: "iso-a11",
    code: "A.11",
    title: "Physical and Environmental Security",
    description: "Secure areas and equipment security.",
    category: "physical_security",
    mandatory: true,
  },
  {
    id: "iso-a12",
    code: "A.12",
    title: "Operations Security",
    description: "Operational procedures, malware protection, and logging.",
    category: "audit_logging",
    mandatory: true,
  },
  {
    id: "iso-a13",
    code: "A.13",
    title: "Communications Security",
    description: "Network security management and information transfer.",
    category: "data_protection",
    mandatory: true,
  },
  {
    id: "iso-a14",
    code: "A.14",
    title: "System Acquisition, Development and Maintenance",
    description: "Security requirements and secure development.",
    category: "change_management",
    mandatory: true,
  },
  {
    id: "iso-a15",
    code: "A.15",
    title: "Supplier Relationships",
    description: "Information security in supplier relationships.",
    category: "vendor_management",
    mandatory: true,
  },
  {
    id: "iso-a16",
    code: "A.16",
    title: "Information Security Incident Management",
    description: "Management of information security incidents.",
    category: "incident_response",
    mandatory: true,
  },
  {
    id: "iso-a17",
    code: "A.17",
    title: "Business Continuity Management",
    description: "IT continuity and redundancies.",
    category: "business_continuity",
    mandatory: true,
  },
  {
    id: "iso-a18",
    code: "A.18",
    title: "Compliance",
    description: "Compliance with legal, contractual, and security requirements.",
    category: "risk_management",
    mandatory: true,
  },
];

export const ISO27001_FRAMEWORK: ComplianceFramework = {
  id: "iso27001",
  name: "ISO/IEC 27001:2022",
  version: "2022",
  description: "International standard for information security management systems (ISMS).",
  issuer: "ISO/IEC",
  requirements: ISO27001_REQUIREMENTS,
  tags: ["isms", "security", "international"],
};

// --- GDPR Framework ---

const GDPR_REQUIREMENTS: Requirement[] = [
  {
    id: "gdpr-art5",
    code: "Art.5",
    title: "Principles of Processing",
    description: "Lawfulness, fairness, transparency, purpose limitation, data minimisation.",
    category: "privacy",
    mandatory: true,
  },
  {
    id: "gdpr-art6",
    code: "Art.6",
    title: "Lawful Basis for Processing",
    description: "Processing shall be lawful only if at least one legal basis applies.",
    category: "privacy",
    mandatory: true,
  },
  {
    id: "gdpr-art13",
    code: "Art.13",
    title: "Information to be Provided",
    description: "Transparency obligations when collecting personal data.",
    category: "privacy",
    mandatory: true,
  },
  {
    id: "gdpr-art17",
    code: "Art.17",
    title: "Right to Erasure",
    description: "Data subjects have the right to erasure of personal data.",
    category: "privacy",
    mandatory: true,
  },
  {
    id: "gdpr-art25",
    code: "Art.25",
    title: "Data Protection by Design and Default",
    description: "Implement appropriate data protection from the outset.",
    category: "data_protection",
    mandatory: true,
  },
  {
    id: "gdpr-art32",
    code: "Art.32",
    title: "Security of Processing",
    description: "Implement appropriate technical and organisational security measures.",
    category: "data_protection",
    mandatory: true,
  },
  {
    id: "gdpr-art33",
    code: "Art.33",
    title: "Breach Notification to Authority",
    description: "Notify supervisory authority within 72 hours of becoming aware of a breach.",
    category: "incident_response",
    mandatory: true,
  },
  {
    id: "gdpr-art35",
    code: "Art.35",
    title: "Data Protection Impact Assessment",
    description: "DPIA required for high-risk processing operations.",
    category: "risk_management",
    mandatory: true,
  },
  {
    id: "gdpr-art37",
    code: "Art.37",
    title: "Data Protection Officer",
    description: "Designate a DPO where required.",
    category: "risk_management",
    mandatory: false,
    guidance: "Mandatory for public authorities or large-scale processing of sensitive data.",
  },
];

export const GDPR_FRAMEWORK: ComplianceFramework = {
  id: "gdpr",
  name: "GDPR",
  version: "2018",
  description: "EU General Data Protection Regulation — privacy and data protection.",
  issuer: "European Parliament",
  requirements: GDPR_REQUIREMENTS,
  tags: ["privacy", "data-protection", "eu"],
};

// --- Registry ---

export const FRAMEWORK_REGISTRY: Readonly<Record<FrameworkId, ComplianceFramework>> = {
  soc2_type1: SOC2_TYPE1_FRAMEWORK,
  soc2_type2: SOC2_TYPE2_FRAMEWORK,
  iso27001: ISO27001_FRAMEWORK,
  gdpr: GDPR_FRAMEWORK,
  nist_csf: {
    id: "nist_csf",
    name: "NIST Cybersecurity Framework",
    version: "1.1",
    description: "NIST CSF — identify, protect, detect, respond, recover.",
    issuer: "NIST",
    requirements: [],
    tags: ["nist", "cybersecurity"],
  },
  hipaa: {
    id: "hipaa",
    name: "HIPAA",
    version: "2013",
    description: "Health Insurance Portability and Accountability Act.",
    issuer: "US HHS",
    requirements: [],
    tags: ["healthcare", "privacy"],
  },
  pci_dss: {
    id: "pci_dss",
    name: "PCI DSS",
    version: "4.0",
    description: "Payment Card Industry Data Security Standard.",
    issuer: "PCI SSC",
    requirements: [],
    tags: ["payment", "security"],
  },
};

/** Look up a framework definition by ID. */
export function getFramework(id: FrameworkId): ComplianceFramework {
  return FRAMEWORK_REGISTRY[id];
}

/** Return all requirements for a framework filtered by category. */
export function getRequirementsByCategory(
  framework: ComplianceFramework,
  category: RequirementCategory,
): Requirement[] {
  return framework.requirements.filter((r) => r.category === category);
}

/** Return only mandatory requirements. */
export function getMandatoryRequirements(framework: ComplianceFramework): Requirement[] {
  return framework.requirements.filter((r) => r.mandatory);
}
