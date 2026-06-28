// Agent GraphQL type definition string for schema assembly.

export const agentTypeDefs = /* GraphQL */ `
  """A registered verification agent capable of processing claims."""
  type Agent {
    id: ID!
    organizationId: ID!
    name: String!
    description: String
    model: String!
    version: String!
    status: String!
    capabilities: [String!]!
    config: JSON
    trustScore: Float
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AgentEdge {
    cursor: String!
    node: Agent!
  }

  type AgentConnection {
    edges: [AgentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input CreateAgentInput {
    organizationId: ID!
    name: String!
    description: String
    model: String!
    version: String!
    capabilities: [String!]
    config: JSON
    metadata: JSON
  }

  input UpdateAgentInput {
    name: String
    description: String
    model: String
    version: String
    status: String
    capabilities: [String!]
    config: JSON
    metadata: JSON
  }

  extend type Query {
    agent(id: ID!): Agent
    agents(organizationId: ID, status: String, first: Int, after: String): AgentConnection!
  }

  extend type Mutation {
    createAgent(input: CreateAgentInput!): Agent!
    updateAgent(id: ID!, input: UpdateAgentInput!): Agent!
    deleteAgent(id: ID!): Boolean!
  }
`;
