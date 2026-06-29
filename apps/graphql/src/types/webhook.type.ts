// GraphQL type definitions for Webhook domain
import type { Webhook } from "@veritas/contracts";

export const webhookTypeDefs = `#graphql
  type Webhook {
    id: ID!
    organizationId: ID!
    url: String!
    events: [String!]!
    active: Boolean!
    description: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateWebhookInput {
    organizationId: ID!
    url: String!
    events: [String!]!
    description: String
  }

  input UpdateWebhookInput {
    url: String
    events: [String!]
    active: Boolean
    description: String
  }

  extend type Query {
    webhook(id: ID!): Webhook
    webhooks(organizationId: ID, first: Int, after: String): WebhookConnection!
  }

  extend type Mutation {
    createWebhook(input: CreateWebhookInput!): Webhook!
    updateWebhook(id: ID!, input: UpdateWebhookInput!): Webhook!
    deleteWebhook(id: ID!): Boolean!
    pingWebhook(id: ID!): Boolean!
  }

  type WebhookEdge {
    cursor: String!
    node: Webhook!
  }

  type WebhookConnection {
    edges: [WebhookEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }
`;

export type WebhookGql = Webhook;
