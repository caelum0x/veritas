import { AgentClient, type Logger } from '@croo-network/sdk';
import type { AppConfig } from '../config.js';

/**
 * Constructs the single CAP runtime client. `AgentClient` authenticates with the
 * SDK-Key and handles negotiation, on-chain payment/settlement, delivery, and
 * the WebSocket event stream. Account + service registration happen in the CROO
 * dashboard, not here.
 */
export function createAgentClient(config: AppConfig, logger: Logger): AgentClient {
  return new AgentClient(
    {
      baseURL: config.croo.apiUrl,
      wsURL: config.croo.wsUrl,
      rpcURL: config.croo.rpcUrl,
      logger,
    },
    config.croo.sdkKey,
  );
}
