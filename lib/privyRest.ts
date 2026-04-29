/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { config } from './config';
import type {
  PrivyTransactionRequest,
  PrivySendTransactionResult,
  PrivyTransactionRecord
} from './getPrivyClient';

// Direct REST client for Privy's API. Used in production code paths to bypass
// @privy-io/node's SDK, which transitively loads @hpke/* and fails on Vercel's
// serverless runtime due to a packaging bug in @hpke/common.
//
// Authentication: HTTP Basic with appId:appSecret + the privy-app-id header.

const PRIVY_API_BASE = 'https://api.privy.io';

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
  const resp = await fetch(`${PRIVY_API_BASE}${path}`, {
    ...rest,
    headers: { ...authHeaders(), ...extraHeaders, ...(init.headers ?? {}) }
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
