// Tenant GraphQL type definition — a thin alias over Organization for multi-tenancy queries.

export const tenantTypeDefs = /* GraphQL */ `
  """A tenant in the Veritas platform, represented as an Organization."""
  type Tenant {
    id: ID!
    name: String!
    slug: String!
    planId: ID
    metadata: JSON
    createdAt: String!
    updatedAt: String!
  }

  type TenantEdge {
    cursor: String!
    node: Tenant!
  }

  type TenantConnection {
    edges: [TenantEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  extend type Query {
    tenant(id: ID!): Tenant
    tenants(first: Int, after: String): TenantConnection!
    currentTenant: Tenant
  }
`;
