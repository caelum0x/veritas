// Session GraphQL type definition string for schema assembly.

export const sessionTypeDefs = /* GraphQL */ `
  """An authenticated user session with token and expiry metadata."""
  type Session {
    id: ID!
    userId: ID!
    token: String!
    expiresAt: String!
    createdAt: String!
    updatedAt: String!
  }

  type SessionEdge {
    cursor: String!
    node: Session!
  }

  type SessionConnection {
    edges: [SessionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  input CreateSessionInput {
    userId: ID!
    token: String!
    expiresAt: String!
  }

  extend type Query {
    session(id: ID!): Session
    sessions(first: Int, after: String): SessionConnection!
  }

  extend type Mutation {
    createSession(input: CreateSessionInput!): Session!
    deleteSession(id: ID!): Boolean!
  }
`;
