// Organization GraphQL type definition string for schema assembly.

export const organizationTypeDefs = /* GraphQL */ `
  """A tenant organization that owns resources and memberships."""
  type Organization {
    id: ID!
    name: String!
    slug: String!
    logoUrl: String
    website: String
    description: String
    createdAt: String!
    updatedAt: String!
  }

  type OrganizationEdge {
    cursor: String!
    node: Organization!
  }

  type OrganizationConnection {
    edges: [OrganizationEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input CreateOrganizationInput {
    name: String!
    slug: String!
    logoUrl: String
    website: String
    description: String
  }

  input UpdateOrganizationInput {
    name: String
    logoUrl: String
    website: String
    description: String
  }

  extend type Query {
    organization(id: ID!): Organization
    organizationBySlug(slug: String!): Organization
    organizations(first: Int, after: String): OrganizationConnection!
  }

  extend type Mutation {
    createOrganization(input: CreateOrganizationInput!): Organization!
    updateOrganization(id: ID!, input: UpdateOrganizationInput!): Organization!
    deleteOrganization(id: ID!): Boolean!
  }
`;
