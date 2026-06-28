// Claim GraphQL type definition string for schema assembly.

export const claimTypeDefs = /* GraphQL */ `
  """An atomic checkable assertion extracted from input text."""
  type Claim {
    id: ID!
    text: String!
    normalized: String
    verdict: String
    confidence: Float
    reasoning: String
    citationIds: [ID!]!
    order: Int!
    createdAt: String!
    updatedAt: String!
  }

  type ClaimEdge {
    cursor: String!
    node: Claim!
  }

  type ClaimConnection {
    edges: [ClaimEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  input CreateClaimInput {
    text: String!
    order: Int
  }

  input UpdateClaimInput {
    normalized: String
    verdict: String
    confidence: Float
    reasoning: String
  }

  extend type Query {
    claim(id: ID!): Claim
    claims(first: Int, after: String): ClaimConnection!
  }

  extend type Mutation {
    createClaim(input: CreateClaimInput!): Claim!
    updateClaim(id: ID!, input: UpdateClaimInput!): Claim!
    deleteClaim(id: ID!): Boolean!
  }
`;
