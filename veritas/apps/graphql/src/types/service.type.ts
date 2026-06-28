// Service GraphQL type definition: SDL string for the marketplace Service entity.

export const serviceTypeDefs = /* GraphQL */ `
  """A marketplace service offered by an agent for fact-verification tasks."""
  type Service {
    id: ID!
    agentId: ID!
    name: String!
    description: String
    priceUsdc: String!
    estimatedTurnaroundMs: Int
    capabilities: [String!]!
    isActive: Boolean!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ServiceEdge {
    cursor: String!
    node: Service!
  }

  type ServiceConnection {
    edges: [ServiceEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input CreateServiceInput {
    agentId: ID!
    name: String!
    description: String
    priceUsdc: String!
    estimatedTurnaroundMs: Int
    capabilities: [String!]
    metadata: JSON
  }

  input UpdateServiceInput {
    name: String
    description: String
    priceUsdc: String
    estimatedTurnaroundMs: Int
    capabilities: [String!]
    isActive: Boolean
    metadata: JSON
  }

  extend type Query {
    service(id: ID!): Service
    services(agentId: ID, isActive: Boolean, first: Int, after: String): ServiceConnection!
  }

  extend type Mutation {
    createService(input: CreateServiceInput!): Service!
    updateService(id: ID!, input: UpdateServiceInput!): Service!
    deleteService(id: ID!): Boolean!
  }
`;
