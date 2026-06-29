// Verdict GraphQL type definition: SDL string for the adjudicated claim outcome.

export const verdictTypeDefs = /* GraphQL */ `
  """Adjudicated outcome for a single claim with confidence and supporting citations."""
  type Verdict {
    id: ID!
    claimId: ID!
    verdict: String!
    confidence: Float!
    reasoning: String!
    citationIds: [ID!]!
    citations: [Citation!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type VerdictConnection {
    edges: [VerdictEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type VerdictEdge {
    node: Verdict!
    cursor: String!
  }

  extend type Query {
    verdict(id: ID!): Verdict
    verdicts(claimId: ID, first: Int, after: String): VerdictConnection!
  }
`;
