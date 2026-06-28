// User GraphQL type definition string for schema assembly.

export const userTypeDefs = /* GraphQL */ `
  """A registered user of the platform."""
  type User {
    id: ID!
    email: String!
    name: String
    avatarUrl: String
    emailVerified: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type UserEdge {
    cursor: String!
    node: User!
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  input CreateUserInput {
    email: String!
    name: String
  }

  input UpdateUserInput {
    name: String
    avatarUrl: String
  }

  extend type Query {
    user(id: ID!): User
    me: User
    users(first: Int, after: String): UserConnection!
  }

  extend type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
  }
`;
