// Invoice GraphQL type definition string for schema assembly.

export const invoiceTypeDefs = /* GraphQL */ `
  """A billing invoice issued to an organization for a subscription period."""
  type Invoice {
    id: ID!
    organizationId: ID!
    subscriptionId: ID
    status: String!
    amountDue: Money!
    amountPaid: Money!
    currency: String!
    periodStart: String!
    periodEnd: String!
    dueDate: String
    paidAt: String
    lineItems: [InvoiceLineItem!]!
    metadata: JSON
    createdAt: String!
    updatedAt: String!
  }

  """A single line item on an invoice."""
  type InvoiceLineItem {
    description: String!
    quantity: Float!
    unitAmount: Money!
    totalAmount: Money!
    metadata: JSON
  }

  type InvoiceEdge {
    cursor: String!
    node: Invoice!
  }

  type InvoiceConnection {
    edges: [InvoiceEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  extend type Query {
    invoice(id: ID!): Invoice
    invoices(organizationId: ID, status: String, first: Int, after: String): InvoiceConnection!
  }
`;
