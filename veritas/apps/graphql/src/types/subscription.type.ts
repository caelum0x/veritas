// GraphQL type definitions for Subscription domain
import type { Subscription } from "@veritas/contracts";

export const subscriptionTypeDefs = `#graphql
  enum SubscriptionStatus {
    TRIALING
    ACTIVE
    PAST_DUE
    CANCELLED
    EXPIRED
  }

  type Subscription {
    id: ID!
    organizationId: ID!
    planId: ID!
    status: SubscriptionStatus!
    currentPeriodStart: DateTime!
    currentPeriodEnd: DateTime!
    cancelAtPeriodEnd: Boolean!
    cancelledAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateSubscriptionInput {
    organizationId: ID!
    planId: ID!
    currentPeriodStart: DateTime!
    currentPeriodEnd: DateTime!
  }

  input UpdateSubscriptionInput {
    status: SubscriptionStatus
    planId: ID
    cancelAtPeriodEnd: Boolean
    cancelledAt: DateTime
  }

  extend type Query {
    subscription(id: ID!): Subscription
    subscriptions(organizationId: ID, first: Int, after: String): SubscriptionConnection!
  }

  extend type Mutation {
    createSubscription(input: CreateSubscriptionInput!): Subscription!
    updateSubscription(id: ID!, input: UpdateSubscriptionInput!): Subscription!
    cancelSubscription(id: ID!): Subscription!
  }

  type SubscriptionEdge {
    cursor: String!
    node: Subscription!
  }

  type SubscriptionConnection {
    edges: [SubscriptionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }
`;

export type SubscriptionGql = Subscription;
