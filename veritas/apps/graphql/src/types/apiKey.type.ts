// GraphQL type definitions for ApiKey domain
import type { ApiKey } from "@veritas/contracts";

export const apiKeyTypeDefs = `#graphql
  type ApiKey {
    id: ID!
    organizationId: ID!
    name: String!
    prefix: String!
    scopes: [String!]!
    expiresAt: DateTime
    lastUsedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ApiKeyWithSecret {
    id: ID!
    organizationId: ID!
    name: String!
    prefix: String!
    secret: String!
    scopes: [String!]!
    expiresAt: DateTime
    lastUsedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateApiKeyInput {
    name: String!
    scopes: [String!]!
    expiresAt: DateTime
  }

  extend type Query {
    apiKey(id: ID!): ApiKey
    apiKeys(organizationId: ID!): [ApiKey!]!
  }

  extend type Mutation {
    createApiKey(organizationId: ID!, input: CreateApiKeyInput!): ApiKeyWithSecret!
    revokeApiKey(id: ID!): Boolean!
  }
`;

export type ApiKeyGql = ApiKey;
