// Settlement GraphQL type definition string for schema assembly.

export const settlementTypeDefs = /* GraphQL */ `
  """A financial settlement record between parties for a completed order."""
  type Settlement {
    id: ID!
    orderId: ID!
    status: String!
    amount: String!
    currency: String!
    settledAt: String
    createdAt: String!
    updatedAt: String!
  }

  type SettlementEdge {
    cursor: String!
    node: Settlement!
  }

  type SettlementConnection {
    edges: [SettlementEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  input CreateSettlementInput {
    orderId: ID!
    amount: String!
    currency: String!
  }

  input UpdateSettlementInput {
    status: String
    settledAt: String
  }

  extend type Query {
    settlement(id: ID!): Settlement
    settlements(first: Int, after: String): SettlementConnection!
  }

  extend type Mutation {
    createSettlement(input: CreateSettlementInput!): Settlement!
    updateSettlement(id: ID!, input: UpdateSettlementInput!): Settlement!
    deleteSettlement(id: ID!): Boolean!
  }
`;
