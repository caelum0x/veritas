// Transaction GraphQL type definition string for schema assembly.

export const transactionTypeDefs = /* GraphQL */ `
  """A financial transaction record associated with a wallet or settlement."""
  type Transaction {
    id: ID!
    walletId: ID!
    settlementId: ID
    kind: String!
    amount: Money!
    reference: String
    metadata: JSON
    createdAt: String!
    updatedAt: String!
  }

  type TransactionEdge {
    cursor: String!
    node: Transaction!
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input CreateTransactionInput {
    walletId: ID!
    settlementId: ID
    kind: String!
    amount: Money!
    reference: String
    metadata: JSON
  }

  extend type Query {
    transaction(id: ID!): Transaction
    transactions(first: Int, after: String, walletId: ID): TransactionConnection!
  }

  extend type Mutation {
    createTransaction(input: CreateTransactionInput!): Transaction!
  }
`;
