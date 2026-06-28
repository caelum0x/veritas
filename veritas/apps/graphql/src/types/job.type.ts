// Job GraphQL type definition: SDL string for the asynchronous verification Job entity.

export const jobTypeDefs = /* GraphQL */ `
  """An asynchronous verification work item with lifecycle status tracking."""
  type Job {
    id: ID!
    verificationId: ID
    status: String!
    attempts: Int!
    error: String
    startedAt: DateTime
    finishedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type JobEdge {
    cursor: String!
    node: Job!
  }

  type JobConnection {
    edges: [JobEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input SubmitJobInput {
    text: String
    claims: [String!]
    context: String
    allowedDomains: [String!]
    idempotencyKey: String
  }

  extend type Query {
    job(id: ID!): Job
    jobs(status: String, first: Int, after: String): JobConnection!
  }

  extend type Mutation {
    submitJob(input: SubmitJobInput!): Job!
    cancelJob(id: ID!): Job!
  }
`;
