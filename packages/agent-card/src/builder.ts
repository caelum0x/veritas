// Fluent builder for constructing a Veritas AgentCard — validates and assembles all parts.

import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { AuthSchemeSchema, type AuthScheme } from "./authentication.js";
import { EndpointSchema, type Endpoint, type CreateEndpoint, makeEndpoint } from "./endpoint.js";
import { PricingSchema, type Pricing } from "./pricing.js";
import {
  SemVerSchema,
  AgentProtocolVersionSchema,
  AgentMaturitySchema,
  AgentRuntimeSchema,
  type SemVer,
  type AgentProtocolVersion,
  type AgentMaturity,
  type AgentRuntime,
  type Contact,
  type Extensions,
  ContactSchema,
} from "./types.js";
import { CardValidationError } from "./errors.js";

const BuilderAgentCardSchema = z.object({
  /** Unique identifier for the agent, e.g. "veritas.fact-checker". */
  id: z.string().min(1),
  /** Human-readable display name. */
  name: z.string().min(1),
  description: z.string().min(1),
  version: SemVerSchema,
  protocolVersion: AgentProtocolVersionSchema,
  maturity: AgentMaturitySchema,
  runtime: AgentRuntimeSchema,
  /** Canonical homepage or documentation URL. */
  url: z.string().url().optional(),
  contact: ContactSchema.optional(),
  /** Default auth scheme applied to endpoints that don't override it. */
  defaultAuth: AuthSchemeSchema.optional(),
  endpoints: z.array(EndpointSchema).min(1),
  pricing: PricingSchema.optional(),
  /** Arbitrary extension map for forward-compatibility. */
  extensions: z.record(z.unknown()).default({}),
  /** ISO 8601 timestamp when the card was last updated. */
  updatedAt: z.string().optional(),
});

// Distinct from card.ts's published AgentCard: this is the builder-produced
// card (protocolVersion/maturity/runtime/pricing), exported as BuilderAgentCard.
export type BuilderAgentCard = z.infer<typeof BuilderAgentCardSchema>;

interface BuilderState {
  id?: string;
  name?: string;
  description?: string;
  version?: SemVer;
  protocolVersion?: AgentProtocolVersion;
  maturity?: AgentMaturity;
  runtime?: AgentRuntime;
  url?: string;
  contact?: Contact;
  defaultAuth?: AuthScheme;
  endpoints: Endpoint[];
  pricing?: Pricing;
  extensions: Extensions;
}

/** Fluent builder that accumulates agent card fields and validates on `.build()`. */
export class AgentCardBuilder {
  private readonly state: BuilderState;

  constructor(initial: Partial<BuilderState> = {}) {
    this.state = {
      endpoints: [],
      extensions: {},
      ...initial,
    };
  }

  withId(id: string): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, id });
  }

  withName(name: string): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, name });
  }

  withDescription(description: string): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, description });
  }

  withVersion(version: SemVer): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, version });
  }

  withProtocolVersion(protocolVersion: AgentProtocolVersion): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, protocolVersion });
  }

  withMaturity(maturity: AgentMaturity): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, maturity });
  }

  withRuntime(runtime: AgentRuntime): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, runtime });
  }

  withUrl(url: string): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, url });
  }

  withContact(contact: Contact): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, contact });
  }

  withDefaultAuth(auth: AuthScheme): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, defaultAuth: auth });
  }

  addEndpoint(input: CreateEndpoint): AgentCardBuilder {
    const endpoint = makeEndpoint(input);
    return new AgentCardBuilder({
      ...this.state,
      endpoints: [...this.state.endpoints, endpoint],
    });
  }

  withPricing(pricing: Pricing): AgentCardBuilder {
    return new AgentCardBuilder({ ...this.state, pricing });
  }

  withExtension(key: string, value: unknown): AgentCardBuilder {
    return new AgentCardBuilder({
      ...this.state,
      extensions: { ...this.state.extensions, [key]: value },
    });
  }

  /** Validate accumulated state and return a `Result<BuilderAgentCard>`. */
  build(): Result<BuilderAgentCard, CardValidationError> {
    const raw = {
      ...this.state,
      updatedAt: new Date().toISOString(),
    };

    const parsed = BuilderAgentCardSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      return err(new CardValidationError(`Invalid agent card: ${msg}`));
    }

    return ok(parsed.data);
  }
}

/** Convenience factory — returns a fresh `AgentCardBuilder`. */
export function agentCardBuilder(): AgentCardBuilder {
  return new AgentCardBuilder();
}
