/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { config } from './config';

// Direct REST client for Privy's API. Used in production code paths to bypass
// @privy-io/node's SDK, which transitively loads @hpke/* and fails on Vercel's
// serverless runtime due to a packaging bug in @hpke/common.
//
// Authentication: HTTP Basic with appId:appSecret + the privy-app-id header.

const PRIVY_API_BASE = 'https://api.privy.io';

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

function authHeaders(): Record<string, string> {
  if (!config.PRIVY_APP_ID || !config.PRIVY_APP_SECRET) {
    throw new Error('Privy is not configured: missing PRIVY_APP_ID or PRIVY_APP_SECRET');
  }
  const basic = Buffer.from(`${config.PRIVY_APP_ID}:${config.PRIVY_APP_SECRET}`).toString('base64');
  return {
    Authorization: `Basic ${basic}`,
    'privy-app-id': config.PRIVY_APP_ID,
    'Content-Type': 'application/json'
  };
}

async function request<T>(path: string, init: RequestInit & { extraHeaders?: Record<string, string> } = {}): Promise<T> {
  const { extraHeaders, ...rest } = init;
  // Auth headers go last so neither caller-supplied init.headers nor extraHeaders can
  // accidentally override Authorization / privy-app-id.
  const resp = await fetch(`${PRIVY_API_BASE}${path}`, {
    ...rest,
    headers: { ...(init.headers ?? {}), ...extraHeaders, ...authHeaders() }
  });
  if (!resp.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await resp.json());
    } catch {
      detail = await resp.text().catch(() => '');
    }
    throw new Error(`Privy REST ${path} failed: ${resp.status} ${resp.statusText} — ${detail}`);
  }
  return (await resp.json()) as T;
}

export async function privyGetWallet(
  walletId: string
): Promise<{ id: string; address: string; chain_type: string }> {
  return request(`/v1/wallets/${encodeURIComponent(walletId)}`);
}

// Memoize wallet-id → address. Privy server-wallet addresses never change for a wallet id,
// so a single lookup per process is enough. Shared between gas-estimation in vote.ts and
// the balance check in getRelayerBalance.ts.
const walletAddressCache: Record<string, `0x${string}`> = {};

export async function privyGetWalletAddress(walletId: string): Promise<`0x${string}`> {
  if (walletAddressCache[walletId]) return walletAddressCache[walletId];
  const wallet = await privyGetWallet(walletId);
  const address = wallet.address as `0x${string}`;
  walletAddressCache[walletId] = address;
  return address;
}

export async function privyGetTransaction(transactionId: string): Promise<PrivyTransactionRecord> {
  return request(`/v1/transactions/${encodeURIComponent(transactionId)}`);
}

export async function privySendTransaction(
  walletId: string,
  opts: {
    caip2: string;
    transaction: PrivyTransactionRequest;
    idempotencyKey?: string;
  }
): Promise<PrivySendTransactionResult> {
  const body = {
    method: 'eth_sendTransaction',
    caip2: opts.caip2,
    params: { transaction: opts.transaction }
  };
  const resp = await request<{ data?: PrivySendTransactionResult } & PrivySendTransactionResult>(
    `/v1/wallets/${encodeURIComponent(walletId)}/rpc`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      extraHeaders: opts.idempotencyKey ? { 'privy-idempotency-key': opts.idempotencyKey } : undefined
    }
  );
  // Privy wraps the response in `{ method, data: { hash, transaction_id, caip2 } }`
  // for RPC-shaped endpoints. Unwrap if present.
  return resp.data ?? resp;
}
