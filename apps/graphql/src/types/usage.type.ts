// Usage GraphQL type definition string for schema assembly.

export const usageTypeDefs = /* GraphQL */ `
  """A recorded unit of platform usage for billing and metering purposes."""
  type Usage {
    id: ID!
    organizationId: ID!
    subscriptionId: ID
    metric: String!
    quantity: Float!
    periodStart: String!
    periodEnd: String!
    metadata: JSON
    createdAt: String!
    updatedAt: String!
  }

  type UsageEdge {
    cursor: String!
    node: Usage!
  }

  type UsageConnection {
    edges: [UsageEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  input CreateUsageInput {
    organizationId: ID!
    subscriptionId: ID
    metric: String!
    quantity: Float!
    periodStart: String!
    periodEnd: String!
    metadata: JSON
  }

  extend type Query {
    usage(id: ID!): Usage
    usages(organizationId: ID, first: Int, after: String): UsageConnection!
  }

  extend type Mutation {
    recordUsage(input: CreateUsageInput!): Usage!
    deleteUsage(id: ID!): Boolean!
  }
`;
