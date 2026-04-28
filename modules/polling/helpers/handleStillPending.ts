/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { parseGwei, numberToHex } from 'viem';
import { config } from 'lib/config';
import { getPrivyClient } from 'lib/getPrivyClient';
import { cacheSetNX } from 'modules/cache/cache';
import { SupportedNetworks } from 'modules/web3/constants/networks';
import { postRequestToDiscord } from 'modules/app/api/postRequestToDiscord';
import { getGaslessPublicClient } from 'modules/web3/helpers/getPublicClient';
import { networkNameToChainId } from 'modules/web3/helpers/chain';
import { getPrivyWalletConfig } from './relayerCredentials';
import logger from 'lib/logger';

const BUMP_MULTIPLIER_NUM = 14n; // 1.4x as 14/10 to keep arithmetic in BigInt
const BUMP_MULTIPLIER_DEN = 10n;
const MAX_BUMP_ATTEMPTS = 2;
const ABSOLUTE_PRIORITY_FEE_CEILING = parseGwei('1');
const BUMP_ATTEMPT_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// Webhook payload shape from Privy's transaction.still_pending event.
// Flat structure with transaction_request nested, all snake_case.
type StillPendingPayload = {
  type?: string;
  transaction_id: string;
  transaction_hash?: `0x${string}`;
  wallet_id: string;
  caip2: string;
  // Privy sends Quantity fields as 0x-prefixed hex strings on the wire.
  transaction_request: {
    chain_id?: number;
    to: string;
    data?: `0x${string}`;
    value?: `0x${string}`;
    nonce: number;
    gas_limit?: `0x${string}`;
    max_fee_per_gas?: `0x${string}`;
    max_priority_fee_per_gas?: `0x${string}`;
    type?: number | string;
  };
};

async function alert(content: string): Promise<void> {
  if (!config.GASLESS_WEBHOOK_URL) {
    logger.warn(`[gasless] alert (no webhook configured): ${content}`);
    return;
  }
  try {
    await postRequestToDiscord({ url: config.GASLESS_WEBHOOK_URL, content, notify: true });
  } catch (err) {
    logger.error('[gasless] failed to post Discord alert', (err as Error).message);
  }
}

function networkForWalletId(walletId: string): SupportedNetworks {
  if (walletId && walletId === config.PRIVY_WALLET_ID_MAINNET) return SupportedNetworks.MAINNET;
  if (walletId && walletId === config.PRIVY_WALLET_ID_TESTNET) return SupportedNetworks.TENDERLY;
  throw new Error(`Unknown Privy wallet id: ${walletId}`);
}

async function claimAttemptSlot(
  transactionId: string,
  network: SupportedNetworks
): Promise<number | null> {
  for (let n = 1; n <= MAX_BUMP_ATTEMPTS; n++) {
    const claimed = await cacheSetNX(
      `bump-attempt-${transactionId}-${n}`,
      Date.now().toString(),
      network,
      BUMP_ATTEMPT_TTL_MS
    );
    if (claimed) return n;
  }
  return null;
}

function bump(fee: bigint): bigint {
  return (fee * BUMP_MULTIPLIER_NUM) / BUMP_MULTIPLIER_DEN;
}

async function isAlreadyMined(
  network: SupportedNetworks,
  hash: string | undefined
): Promise<boolean> {
  if (!hash) return false;
  try {
    const client = getGaslessPublicClient(networkNameToChainId(network));
    const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
    return receipt != null;
  } catch {
    // No receipt yet (or RPC hiccup); treat as not-mined.
    return false;
  }
}

export async function handleStillPending(rawPayload: Record<string, unknown>): Promise<void> {
  const payload = rawPayload as unknown as StillPendingPayload;
  const { transaction_id, transaction_hash, wallet_id, caip2, transaction_request } = payload;

  if (
    !transaction_id ||
    !wallet_id ||
    !caip2 ||
    !transaction_request ||
    !transaction_request.to ||
    transaction_request.nonce === undefined ||
    transaction_request.nonce === null
  ) {
    logger.error('[gasless] still_pending payload missing required fields', payload);
    return;
  }

  const network = networkForWalletId(wallet_id);
  const { caip2: configuredCaip2 } = getPrivyWalletConfig(network);
  if (caip2 !== configuredCaip2) {
    await alert(
      `Privy bump aborted: payload caip2 ${caip2} does not match configured ${configuredCaip2} for wallet ${wallet_id}.`
    );
    return;
  }

  const attempt = await claimAttemptSlot(transaction_id, network);
  if (attempt === null) {
    await alert(
      `Privy bump cap reached for tx ${transaction_id} after ${MAX_BUMP_ATTEMPTS} attempts; investigate.`
    );
    return;
  }

  // Pre-flight: skip if the original tx has already mined on-chain. This guards against
  // racing the webhook against settlement.
  if (await isAlreadyMined(network, transaction_hash)) {
    logger.debug(`[gasless] tx ${transaction_id} already mined; skipping bump`);
    return;
  }

  const currentPriority = BigInt(transaction_request.max_priority_fee_per_gas ?? '0');
  const currentMaxFee = BigInt(transaction_request.max_fee_per_gas ?? '0');
  if (currentPriority === 0n || currentMaxFee === 0n) {
    await alert(
      `Privy bump aborted for tx ${transaction_id}: cannot read current fees from transaction_request.`
    );
    return;
  }

  const bumpedPriorityFee = bump(currentPriority);
  if (bumpedPriorityFee > ABSOLUTE_PRIORITY_FEE_CEILING) {
    await alert(
      `Privy bump aborted for tx ${transaction_id}: priority fee ${bumpedPriorityFee} would exceed ceiling ${ABSOLUTE_PRIORITY_FEE_CEILING}. Something is abnormal.`
    );
    return;
  }
  const bumpedMaxFee = bump(currentMaxFee);

  try {
    const privy = getPrivyClient();
    await privy
      .wallets()
      .ethereum()
      .sendTransaction(wallet_id, {
        caip2,
        params: {
          transaction: {
            to: transaction_request.to,
            data: transaction_request.data,
            value: transaction_request.value,
            nonce: transaction_request.nonce,
            chain_id:
              transaction_request.chain_id !== undefined
                ? numberToHex(transaction_request.chain_id)
                : undefined,
            max_priority_fee_per_gas: numberToHex(bumpedPriorityFee),
            max_fee_per_gas: numberToHex(bumpedMaxFee)
          }
        },
        idempotency_key: `bump-${transaction_id}-${attempt}`
      });
    logger.debug(`[gasless] bumped tx ${transaction_id} (attempt ${attempt}/${MAX_BUMP_ATTEMPTS})`);
  } catch (err) {
    await alert(
      `Privy bump send failed for tx ${transaction_id} on attempt ${attempt}: ${(err as Error).message}`
    );
    throw err;
  }
}

export const __testables = {
  bump,
  ABSOLUTE_PRIORITY_FEE_CEILING,
  MAX_BUMP_ATTEMPTS
};
