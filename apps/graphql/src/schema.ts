// Assembles the complete GraphQL schema from SDL type definitions and resolvers
import { buildSchema, GraphQLSchema } from "graphql";
import { pageInfoTypeDef } from "./pagination.js";
import { claimTypeDefs } from "./types/claim.type.js";
import { citationTypeDefs } from "./types/citation.type.js";
import { verdictTypeDefs } from "./types/verdict.type.js";
import { reportTypeDefs } from "./types/report.type.js";
import { provenanceTypeDefs } from "./types/provenance.type.js";
import { jobTypeDefs } from "./types/job.type.js";
import { orderTypeDefs } from "./types/order.type.js";
import { negotiationTypeDefs } from "./types/negotiation.type.js";
import { deliveryTypeDefs } from "./types/delivery.type.js";
import { agentTypeDefs } from "./types/agent.type.js";
import { serviceTypeDefs } from "./types/service.type.js";
import { apiKeyTypeDefs } from "./types/apiKey.type.js";
import { walletTypeDefs } from "./types/wallet.type.js";
import { usageTypeDefs } from "./types/usage.type.js";
import { invoiceTypeDefs } from "./types/invoice.type.js";
import { planTypeDefs } from "./types/plan.type.js";
import { subscriptionTypeDefs } from "./types/subscription.type.js";
import { webhookTypeDefs } from "./types/webhook.type.js";
import { auditLogTypeDefs } from "./types/auditLog.type.js";
import { userTypeDefs } from "./types/user.type.js";
import { organizationTypeDefs } from "./types/organization.type.js";
import { sessionTypeDefs } from "./types/session.type.js";
import { settlementTypeDefs } from "./types/settlement.type.js";
import { transactionTypeDefs } from "./types/transaction.type.js";
import { tenantTypeDefs } from "./types/tenant.type.js";

/** Base types that every extend type query/mutation builds on. */
const baseTypeDefs = /* GraphQL */ `
  scalar DateTime
  scalar JSON
  scalar Money

  ${pageInfoTypeDef}

  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

/** Ordered list of all SDL fragments that compose the full schema. */
const allTypeDefs = [
  baseTypeDefs,
  claimTypeDefs,
  citationTypeDefs,
  verdictTypeDefs,
  reportTypeDefs,
  provenanceTypeDefs,
  jobTypeDefs,
  orderTypeDefs,
  negotiationTypeDefs,
  deliveryTypeDefs,
  agentTypeDefs,
  serviceTypeDefs,
  apiKeyTypeDefs,
  walletTypeDefs,
  usageTypeDefs,
  invoiceTypeDefs,
  planTypeDefs,
  subscriptionTypeDefs,
  webhookTypeDefs,
  auditLogTypeDefs,
  userTypeDefs,
  organizationTypeDefs,
  sessionTypeDefs,
  settlementTypeDefs,
  transactionTypeDefs,
  tenantTypeDefs,
].join("\n");

/** Build and return the full GraphQL schema instance. */
export function buildAppSchema(): GraphQLSchema {
  return buildSchema(allTypeDefs);
}

/** The combined SDL string for introspection or export purposes. */
export const schemaSDL = allTypeDefs;
