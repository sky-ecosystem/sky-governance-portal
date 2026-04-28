/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { config } from './config';

// Minimal surface area we use, kept here so consumers don't depend on @privy-io/node types directly.
// Lazy-required at runtime so vite/test transforms don't statically resolve the SDK.
// Shape derived from Privy's Node SDK quickstart and the speeding-up-transactions recipe.
// Privy "Quantity" fields accept a 0x-prefixed hex string or a non-negative integer.
// In practice the API rejects decimal strings, so we always send 0x-hex via viem's numberToHex.
type Quantity = `0x${string}` | number;

export type PrivyTransactionRequest = {
  to: string;
  value?: Quantity;
  data?: `0x${string}`;
  nonce?: Quantity;
  chain_id?: Quantity;
  gas_limit?: Quantity;
  max_fee_per_gas?: Quantity;
  max_priority_fee_per_gas?: Quantity;
};

export type PrivySendTransactionResult = {
  hash: string;
  transaction_id?: string;
  caip2: string;
};

export type PrivyVerifiedWebhook<T = Record<string, unknown>> = T & { type: string };

export type PrivyTransactionRecord = {
  id: string;
  caip2: string;
  status:
    | 'broadcasted'
    | 'pending'
    | 'confirmed'
    | 'finalized'
    | 'failed'
    | 'execution_reverted'
    | 'provider_error'
    | 'replaced';
  transaction_hash: string | null;
  wallet_id: string;
  created_at: number;
  method?: string;
};

export type PrivyClientLike = {
  wallets: () => {
    get: (walletId: string) => Promise<{ id: string; address: string; chain_type: string }>;
    ethereum: () => {
      sendTransaction: (
        walletId: string,
        opts: {
          caip2: string;
          params: { transaction: PrivyTransactionRequest };
          sponsor?: boolean;
          idempotency_key?: string;
        }
      ) => Promise<PrivySendTransactionResult>;
    };
  };
  transactions: () => {
    get: (transactionId: string) => Promise<PrivyTransactionRecord>;
  };
  webhooks: () => {
    verify: (args: {
      // Privy's SDK accepts a parsed object and JSON.stringifies it internally before
      // calling Svix's verifier — passing a string here would get double-encoded.
      payload: Record<string, unknown> | object;
      svix: { id: string; timestamp: string; signature: string };
    }) => Promise<PrivyVerifiedWebhook>;
  };
};

let _client: PrivyClientLike | null = null;

export function getPrivyClient(): PrivyClientLike {
  if (!_client) {
    if (!config.PRIVY_APP_ID || !config.PRIVY_APP_SECRET) {
      throw new Error('Privy is not configured: missing PRIVY_APP_ID or PRIVY_APP_SECRET');
    }
    // Lazy-require so bundlers/test transforms don't statically resolve the SDK.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrivyClient } = require('@privy-io/node');
    _client = new PrivyClient({
      appId: config.PRIVY_APP_ID,
      appSecret: config.PRIVY_APP_SECRET,
      webhookSigningSecret: config.PRIVY_WEBHOOK_SIGNING_SECRET
    }) as PrivyClientLike;
  }
  return _client;
}

