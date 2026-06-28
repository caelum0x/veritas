// Report GraphQL type definition: SDL string for the Report entity and its nested types.

export const reportTypeDefs = /* GraphQL */ `
  """Verdict-count breakdown embedded in a Report."""
  type ReportVerdictCounts {
    supported: Int!
    refuted: Int!
    unverifiable: Int!
  }

  """Claim-level adjudication result embedded in a Report."""
  type ReportClaim {
    claim: String!
    verdict: String!
    confidence: Float!
    reasoning: String!
    citationIds: [ID!]!
  }

  """Tamper-evident metadata describing how a Report was produced."""
  type ReportProvenance {
    contentHash: String!
    verifier: String!
    verifierVersion: String!
    model: String!
    effort: String!
    createdAt: DateTime!
    claimCount: Int!
    sourceCount: Int!
  }

  """A persisted verification report produced by a verification run."""
  type Report {
    id: ID!
    verificationId: ID!
    contentHash: String!
    summary: String!
    trustScore: Float!
    counts: ReportVerdictCounts!
    claims: [ReportClaim!]!
    provenance: ReportProvenance!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ReportEdge {
    cursor: String!
    node: Report!
  }

  type ReportConnection {
    edges: [ReportEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  extend type Query {
    report(id: ID!): Report
    reportByVerification(verificationId: ID!): Report
    reports(verificationId: ID, first: Int, after: String): ReportConnection!
  }

  extend type Mutation {
    deleteReport(id: ID!): Boolean!
  }
`;
