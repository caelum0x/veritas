// Request-scoped context extending observability's RequestContext with auth principal.

import type { RequestContext } from "@veritas/observability";
import type { Principal } from "@veritas/auth";

export interface GatewayRequestContext extends RequestContext {
  readonly requestId: string;
  readonly principal?: Principal;
}

export type { RequestContext };
