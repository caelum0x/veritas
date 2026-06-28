// Provenance GraphQL type definition: SDL string for tamper-evident report provenance.

export const provenanceTypeDefs = /* GraphQL */ `
  """
  Standalone provenance record describing how a verification was produced.
  Embedded in Report; exposed here for direct queries on provenance details.
  """
  type Provenance {
    contentHash: String!
    verifier: String!
    verifierVersion: String!
    model: String!
    effort: String!
    createdAt: DateTime!
    claimCount: Int!
    sourceCount: Int!
  }
`;
