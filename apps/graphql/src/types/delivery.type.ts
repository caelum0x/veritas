// Delivery GraphQL type definition string for schema assembly.

export const deliveryTypeDefs = /* GraphQL */ `
  """A result delivery associated with a completed verification order."""
  type Delivery {
    id: ID!
    orderId: ID!
    reportId: ID
    status: String!
    channel: String!
    endpoint: String
    attempts: Int!
    lastAttemptAt: DateTime
    deliveredAt: DateTime
    error: String
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DeliveryEdge {
    cursor: String!
    node: Delivery!
  }

  type DeliveryConnection {
    edges: [DeliveryEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input CreateDeliveryInput {
    orderId: ID!
    channel: String!
    endpoint: String
    metadata: JSON
  }

  input UpdateDeliveryInput {
    status: String
    endpoint: String
    metadata: JSON
  }

  extend type Query {
    delivery(id: ID!): Delivery
    deliveries(orderId: ID, status: String, first: Int, after: String): DeliveryConnection!
  }

  extend type Mutation {
    createDelivery(input: CreateDeliveryInput!): Delivery!
    updateDelivery(id: ID!, input: UpdateDeliveryInput!): Delivery!
    retryDelivery(id: ID!): Delivery!
  }
`;
