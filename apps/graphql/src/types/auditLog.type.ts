// AuditLog GraphQL type definition string for schema assembly.

export const auditLogTypeDefs = /* GraphQL */ `
  """An immutable audit trail entry recording actor actions on resources."""
  type AuditLog {
    id: ID!
    organizationId: ID!
    actorType: String!
    actorId: ID!
    action: String!
    resourceType: String!
    resourceId: ID!
    metadata: JSON
    ipAddress: String
    userAgent: String
    createdAt: String!
  }

  type AuditLogEdge {
    cursor: String!
    node: AuditLog!
  }

  type AuditLogConnection {
    edges: [AuditLogEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  extend type Query {
    auditLog(id: ID!): AuditLog
    auditLogs(organizationId: ID, first: Int, after: String): AuditLogConnection!
  }
`;
