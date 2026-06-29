// Negotiation GraphQL type definition string for schema assembly.

export const negotiationTypeDefs = /* GraphQL */ `
  """A price negotiation between a buyer and an agent for a verification order."""
  type Negotiation {
    id: ID!
    orderId: ID!
    agentId: ID!
    status: String!
    proposedPrice: Money!
    counterPrice: Money
    agreedPrice: Money
    expiresAt: String
    metadata: JSON
    createdAt: String!
    updatedAt: String!
  }

  type NegotiationEdge {
    cursor: String!
    node: Negotiation!
  }

  type NegotiationConnection {
    edges: [NegotiationEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input CreateNegotiationInput {
    orderId: ID!
    agentId: ID!
    proposedPrice: String!
    expiresAt: String
    metadata: JSON
  }

  input UpdateNegotiationInput {
    status: String
    counterPrice: String
    agreedPrice: String
    expiresAt: String
    metadata: JSON
  }

  extend type Query {
    negotiation(id: ID!): Negotiation
    negotiations(first: Int, after: String, orderId: ID): NegotiationConnection!
  }

  extend type Mutation {
    createNegotiation(input: CreateNegotiationInput!): Negotiation!
    updateNegotiation(id: ID!, input: UpdateNegotiationInput!): Negotiation!
    acceptNegotiation(id: ID!): Negotiation!
    rejectNegotiation(id: ID!): Negotiation!
  }
`;
