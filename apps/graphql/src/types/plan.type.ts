// Plan GraphQL SDL type definition — billing plan with features and pricing
export const planTypeDefs = /* GraphQL */ `
  type Plan {
    id: ID!
    name: String!
    description: String
    monthlyPrice: Money!
    annualPrice: Money!
    features: [String!]!
    maxSeats: Int
    maxApiCalls: Int
    maxStorageGb: Int
    isPublic: Boolean!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PlanConnection {
    edges: [PlanEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type PlanEdge {
    cursor: String!
    node: Plan!
  }

  input CreatePlanInput {
    name: String!
    description: String
    monthlyPrice: MoneyInput!
    annualPrice: MoneyInput!
    features: [String!]
    maxSeats: Int
    maxApiCalls: Int
    maxStorageGb: Int
    isPublic: Boolean
  }

  input UpdatePlanInput {
    name: String
    description: String
    monthlyPrice: MoneyInput
    annualPrice: MoneyInput
    features: [String!]
    maxSeats: Int
    maxApiCalls: Int
    maxStorageGb: Int
    isPublic: Boolean
    isActive: Boolean
  }

  extend type Query {
    plan(id: ID!): Plan
    plans(first: Int, after: String, activeOnly: Boolean): PlanConnection!
  }

  extend type Mutation {
    createPlan(input: CreatePlanInput!): Plan!
    updatePlan(id: ID!, input: UpdatePlanInput!): Plan!
    archivePlan(id: ID!): Plan!
  }
`;
