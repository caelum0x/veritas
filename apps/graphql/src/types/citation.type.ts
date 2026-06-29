// Citation GraphQL type definition: SDL string for the Citation entity.

export const citationTypeDefs = /* GraphQL */ `
  """A pointer from a claim's reasoning into a specific source span."""
  type Citation {
    id: ID!
    sourceId: ID!
    url: String!
    title: String
    quote: String
    relevance: Float!
    supports: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CitationConnection {
    edges: [CitationEdge!]!
    pageInfo: PageInfo!
  }

  type CitationEdge {
    node: Citation!
    cursor: String!
  }

  extend type Query {
    citation(id: ID!): Citation
    citations(claimId: ID, first: Int, after: String): CitationConnection!
  }

  extend type Mutation {
    createCitation(input: CreateCitationInput!): Citation!
    updateCitation(id: ID!, input: UpdateCitationInput!): Citation!
    deleteCitation(id: ID!): Boolean!
  }

  input CreateCitationInput {
    sourceId: ID!
    url: String!
    title: String
    quote: String
    relevance: Float!
    supports: Boolean!
  }

  input UpdateCitationInput {
    sourceId: ID
    url: String
    title: String
    quote: String
    relevance: Float
    supports: Boolean
  }
`;
