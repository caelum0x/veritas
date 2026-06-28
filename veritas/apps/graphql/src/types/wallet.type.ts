// GraphQL type definitions for Wallet domain
import type { Wallet } from "@veritas/contracts";

export const walletTypeDefs = `#graphql
  type Wallet {
    id: ID!
    organizationId: ID!
    balanceUsdc: String!
    reservedUsdc: String!
    address: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  extend type Query {
    wallet(id: ID!): Wallet
    walletByOrganization(organizationId: ID!): Wallet
  }

  extend type Mutation {
    createWallet(organizationId: ID!): Wallet!
  }
`;

export type WalletGql = Wallet;
