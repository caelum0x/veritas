// VeritasClient root client: composes all resource sub-clients and shared transport.
import type { SdkConfigInput, SdkConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import { FetchTransport } from "./http/fetch-transport.js";
import type { Transport } from "./http/transport.js";

// Resource imports — each sub-client is instantiated lazily via getters.
import { VerificationResource } from "./resources/verification.js";
import { ReportsResource } from "./resources/reports.js";
import { AgentsResource } from "./resources/agents.js";
import { ServicesResource } from "./resources/services.js";
import { OrdersResource } from "./resources/orders.js";
import { WalletsResource } from "./resources/wallets.js";
import { UsageResource } from "./resources/usage.js";
import { InvoicesResource } from "./resources/invoices.js";
import { PlansResource } from "./resources/plans.js";
import { SubscriptionsResource } from "./resources/subscriptions.js";
import { WebhooksResource } from "./resources/webhooks.js";
import { ApiKeysResource } from "./resources/apiKeys.js";
import { OrganizationsResource } from "./resources/organizations.js";
import { SettlementsResource } from "./resources/settlements.js";
import { TransactionsResource } from "./resources/transactions.js";
import { MeResource } from "./resources/me.js";

export class VeritasClient {
  readonly config: SdkConfig;
  readonly transport: Transport;

  // Resource sub-clients (lazy-initialized via getters)
  private _verification?: VerificationResource;
  private _reports?: ReportsResource;
  private _agents?: AgentsResource;
  private _services?: ServicesResource;
  private _orders?: OrdersResource;
  private _wallets?: WalletsResource;
  private _usage?: UsageResource;
  private _invoices?: InvoicesResource;
  private _plans?: PlansResource;
  private _subscriptions?: SubscriptionsResource;
  private _webhooks?: WebhooksResource;
  private _apiKeys?: ApiKeysResource;
  private _organizations?: OrganizationsResource;
  private _settlements?: SettlementsResource;
  private _transactions?: TransactionsResource;
  private _me?: MeResource;

  constructor(configInput: SdkConfigInput, transport?: Transport) {
    this.config = resolveConfig(configInput);
    this.transport = transport ?? new FetchTransport(this.config);
  }

  get verification(): VerificationResource {
    this._verification ??= new VerificationResource(this.transport, this.config);
    return this._verification;
  }

  get reports(): ReportsResource {
    this._reports ??= new ReportsResource(this.transport, this.config);
    return this._reports;
  }

  get agents(): AgentsResource {
    this._agents ??= new AgentsResource(this.transport, this.config);
    return this._agents;
  }

  get services(): ServicesResource {
    this._services ??= new ServicesResource(this.transport, this.config);
    return this._services;
  }

  get orders(): OrdersResource {
    this._orders ??= new OrdersResource(this.transport, this.config);
    return this._orders;
  }

  get wallets(): WalletsResource {
    this._wallets ??= new WalletsResource(this.transport, this.config);
    return this._wallets;
  }

  get usage(): UsageResource {
    this._usage ??= new UsageResource(this.transport, this.config);
    return this._usage;
  }

  get invoices(): InvoicesResource {
    this._invoices ??= new InvoicesResource(this.transport, this.config);
    return this._invoices;
  }

  get plans(): PlansResource {
    this._plans ??= new PlansResource(this.transport, this.config);
    return this._plans;
  }

  get subscriptions(): SubscriptionsResource {
    this._subscriptions ??= new SubscriptionsResource(this.transport, this.config);
    return this._subscriptions;
  }

  get webhooks(): WebhooksResource {
    this._webhooks ??= new WebhooksResource(this.transport, this.config);
    return this._webhooks;
  }

  get apiKeys(): ApiKeysResource {
    this._apiKeys ??= new ApiKeysResource(this.transport, this.config);
    return this._apiKeys;
  }

  get organizations(): OrganizationsResource {
    this._organizations ??= new OrganizationsResource(this.transport, this.config);
    return this._organizations;
  }

  get settlements(): SettlementsResource {
    this._settlements ??= new SettlementsResource(this.transport, this.config);
    return this._settlements;
  }

  get transactions(): TransactionsResource {
    this._transactions ??= new TransactionsResource(this.transport, this.config);
    return this._transactions;
  }

  get me(): MeResource {
    this._me ??= new MeResource(this.transport, this.config);
    return this._me;
  }
}
