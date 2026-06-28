// Order GraphQL type definition string for schema assembly.

export const orderTypeDefs = /* GraphQL */ `
  """A verification order placed by a user or organization."""
  type Order {
    id: ID!
    organizationId: ID!
    userId: ID!
    status: String!
    text: String!
    priority: Int!
    callbackUrl: String
    metadata: JSON
    totalCost: Money
    createdAt: String!
    updatedAt: String!
  }

  type OrderEdge {
    cursor: String!
    node: Order!
  }

  type OrderConnection {
    edges: [OrderEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input CreateOrderInput {
    organizationId: ID!
    text: String!
    priority: Int
    callbackUrl: String
    metadata: JSON
  }

  input UpdateOrderInput {
    status: String
    priority: Int
    callbackUrl: String
    metadata: JSON
  }

  extend type Query {
    order(id: ID!): Order
    orders(first: Int, after: String, organizationId: ID): OrderConnection!
  }

  extend type Mutation {
    createOrder(input: CreateOrderInput!): Order!
    updateOrder(id: ID!, input: UpdateOrderInput!): Order!
    cancelOrder(id: ID!): Order!
  }
`;
