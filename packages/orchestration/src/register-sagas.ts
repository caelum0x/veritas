// Register all built-in saga definitions with the orchestration registry.
import {
  verifyAndSettleSaga,
  onboardAgentSaga,
  monthlyBillingSaga,
  disputeResolutionSaga,
  createRefundAndCreditSaga,
  type SagaContext,
  type Saga,
} from "@veritas/sagas";
import { OrchestrationRegistry } from "./registry.js";

// Port types mirrored from saga definitions — kept minimal to avoid deep imports.

export interface VerificationPort {
  runVerification(claimId: string, ctx: SagaContext): Promise<{ verdict: string; reportId: string }>;
  cancelVerification(claimId: string, ctx: SagaContext): Promise<void>;
}
export interface SettlementPort {
  holdFunds(orderId: string, amountUsdc: bigint, ctx: SagaContext): Promise<{ holdId: string }>;
  releaseHold(holdId: string, ctx: SagaContext): Promise<void>;
  settle(holdId: string, sellerUserId: string, ctx: SagaContext): Promise<{ settlementId: string }>;
}
export interface OrderStatusPort {
  markComplete(orderId: string, ctx: SagaContext): Promise<void>;
  markFailed(orderId: string, reason: string, ctx: SagaContext): Promise<void>;
}
export interface VerifyAndSettlePorts {
  readonly verification: VerificationPort;
  readonly settlement: SettlementPort;
  readonly orderStatus: OrderStatusPort;
}

export interface AgentRegistryPort {
  register(agentId: string, ownerUserId: string, name: string, ctx: SagaContext): Promise<void>;
  deregister(agentId: string, ctx: SagaContext): Promise<void>;
}
export interface WalletProvisionPort {
  createWallet(agentId: string, ctx: SagaContext): Promise<{ address: string; walletId: string }>;
  deleteWallet(walletId: string, ctx: SagaContext): Promise<void>;
}
export interface ApiKeyProvisionPort {
  issueKey(agentId: string, ctx: SagaContext): Promise<{ apiKeyId: string; secret: string }>;
  revokeKey(apiKeyId: string, ctx: SagaContext): Promise<void>;
}
export interface ServiceBindingPort {
  bindServices(agentId: string, serviceIds: readonly string[], ctx: SagaContext): Promise<void>;
  unbindServices(agentId: string, serviceIds: readonly string[], ctx: SagaContext): Promise<void>;
}
export interface OnboardAgentPorts {
  readonly registry: AgentRegistryPort;
  readonly wallet: WalletProvisionPort;
  readonly apiKey: ApiKeyProvisionPort;
  readonly serviceBinding: ServiceBindingPort;
}

export interface UsageSnapshotPort {
  snapshot(orgId: string, periodStart: string, periodEnd: string, ctx: SagaContext): Promise<{ usageId: string; totalUnits: number }>;
  rollbackSnapshot(usageId: string, ctx: SagaContext): Promise<void>;
}
export interface InvoicePort {
  create(orgId: string, subId: string, usageId: string, periodStart: string, periodEnd: string, ctx: SagaContext): Promise<{ invoiceId: string; amountUsdc: bigint }>;
  void(invoiceId: string, ctx: SagaContext): Promise<void>;
}
export interface WalletChargePort {
  charge(orgId: string, invoiceId: string, amountUsdc: bigint, ctx: SagaContext): Promise<{ chargeId: string }>;
  refund(chargeId: string, ctx: SagaContext): Promise<void>;
}
export interface BillingSettlementPort {
  record(invoiceId: string, chargeId: string, ctx: SagaContext): Promise<{ settlementId: string }>;
}
export interface MonthlyBillingPorts {
  readonly usage: UsageSnapshotPort;
  readonly invoice: InvoicePort;
  readonly charge: WalletChargePort;
  readonly settlement: BillingSettlementPort;
}

export interface EscrowPort {
  lockFunds(orderId: string, amountUsdc: bigint, ctx: SagaContext): Promise<{ escrowId: string }>;
  release(escrowId: string, recipientUserId: string, ctx: SagaContext): Promise<{ settlementId: string }>;
  refund(escrowId: string, buyerUserId: string, ctx: SagaContext): Promise<{ settlementId: string }>;
  split(escrowId: string, buyerUserId: string, sellerUserId: string, ctx: SagaContext): Promise<{ settlementId: string }>;
  unlock(escrowId: string, ctx: SagaContext): Promise<void>;
}
export interface ArbitrationPort {
  open(disputeId: string, orderId: string, ctx: SagaContext): Promise<{ arbitrationId: string }>;
  runArbitration(arbitrationId: string, ctx: SagaContext): Promise<{ ruling: "buyer_wins" | "seller_wins" | "split" }>;
  close(arbitrationId: string, ctx: SagaContext): Promise<void>;
}
export interface DisputeStatusPort {
  markResolved(disputeId: string, ruling: string, settlementId: string, ctx: SagaContext): Promise<void>;
  markFailed(disputeId: string, reason: string, ctx: SagaContext): Promise<void>;
}
export interface DisputeResolutionPorts {
  readonly escrow: EscrowPort;
  readonly arbitration: ArbitrationPort;
  readonly disputeStatus: DisputeStatusPort;
}

/** Full port bundle required to instantiate all built-in saga definitions. */
export interface BuiltInSagaPorts {
  readonly verifyAndSettle: VerifyAndSettlePorts;
  readonly onboardAgent: OnboardAgentPorts;
  readonly monthlyBilling: MonthlyBillingPorts;
  readonly disputeResolution: DisputeResolutionPorts;
  readonly refundAndCredit?: Record<string, unknown>;
}

/**
 * Instantiate all built-in saga definitions with their port adapters and register
 * them into the given OrchestrationRegistry.
 */
export function registerBuiltInSagas(
  registry: OrchestrationRegistry,
  ports: BuiltInSagaPorts
): void {
  registry.registerSaga(verifyAndSettleSaga(ports.verifyAndSettle as Parameters<typeof verifyAndSettleSaga>[0]) as Saga<unknown, unknown>);
  registry.registerSaga(onboardAgentSaga(ports.onboardAgent as Parameters<typeof onboardAgentSaga>[0]) as Saga<unknown, unknown>);
  registry.registerSaga(monthlyBillingSaga(ports.monthlyBilling as Parameters<typeof monthlyBillingSaga>[0]) as Saga<unknown, unknown>);
  registry.registerSaga(disputeResolutionSaga(ports.disputeResolution as Parameters<typeof disputeResolutionSaga>[0]) as Saga<unknown, unknown>);
  registry.registerSaga(createRefundAndCreditSaga(ports.refundAndCredit as Parameters<typeof createRefundAndCreditSaga>[0]) as Saga<unknown, unknown>);
}
