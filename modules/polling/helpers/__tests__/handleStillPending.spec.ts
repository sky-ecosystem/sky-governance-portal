/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { parseGwei } from 'viem';
import { handleStillPending, __testables } from '../handleStillPending';
import { cacheSetNX } from 'modules/cache/cache';
import { getPrivyClient } from 'lib/getPrivyClient';
import { postRequestToDiscord } from 'modules/app/api/postRequestToDiscord';
import { config } from 'lib/config';
import { getGaslessPublicClient } from 'modules/web3/helpers/getPublicClient';

vi.mock('modules/cache/cache');
vi.mock('lib/getPrivyClient');
vi.mock('modules/app/api/postRequestToDiscord');
vi.mock('modules/web3/helpers/getPublicClient');
vi.mock('modules/web3/helpers/chain', () => ({ networkNameToChainId: () => 42161 }));
vi.mock('lib/config', () => ({
  config: {
    PRIVY_WALLET_ID_MAINNET: 'wallet-mainnet',
    PRIVY_WALLET_ID_TESTNET: 'wallet-testnet',
    GASLESS_WEBHOOK_URL: 'https://discord.example/hook'
  },
  isPrivyRelayerEnabled: () => true
}));

const sendTransaction = vi.fn();
const getTransactionReceipt = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (getPrivyClient as Mock).mockReturnValue({
    wallets: () => ({
      ethereum: () => ({ sendTransaction })
    })
  });
  (getGaslessPublicClient as Mock).mockReturnValue({ getTransactionReceipt });
  // Default: not yet mined
  getTransactionReceipt.mockRejectedValue(new Error('not found'));
});

const validPayload = {
  type: 'transaction.still_pending',
  transaction_id: 'tx-123',
  transaction_hash: '0xdeadbeef',
  wallet_id: 'wallet-mainnet',
  caip2: 'eip155:42161',
  transaction_request: {
    chain_id: 42161,
    to: '0xPolling',
    data: '0xabcd',
    value: '0x0',
    nonce: 7,
    max_priority_fee_per_gas: parseGwei('0.1').toString(),
    max_fee_per_gas: parseGwei('0.5').toString()
  }
};

describe('handleStillPending', () => {
  it('claims slot 1 on first attempt and bumps fees by 1.4x', async () => {
    (cacheSetNX as Mock).mockResolvedValueOnce(true);
    sendTransaction.mockResolvedValue({ hash: '0xnew', transactionId: 'tx-bumped', caip2: 'eip155:42161' });

    await handleStillPending(validPayload);

    expect(cacheSetNX).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledTimes(1);
    const [walletId, opts] = sendTransaction.mock.calls[0];
    expect(walletId).toBe('wallet-mainnet');
    expect(opts.caip2).toBe('eip155:42161');
    expect(opts.params.transaction.nonce).toBe(7);
    expect(opts.params.transaction.to).toBe('0xPolling');
    // 0.1 gwei * 1.4 = 0.14 gwei
    expect(BigInt(opts.params.transaction.max_priority_fee_per_gas)).toBe(
      (BigInt(validPayload.transaction_request.max_priority_fee_per_gas) * 14n) / 10n
    );
    expect(opts.idempotency_key).toBe('bump-tx-123-1');
  });

  it('alerts and bails when both attempt slots are taken (cap reached)', async () => {
    (cacheSetNX as Mock).mockResolvedValue(false);

    await handleStillPending(validPayload);

    expect(sendTransaction).not.toHaveBeenCalled();
    expect(postRequestToDiscord).toHaveBeenCalledWith(
      expect.objectContaining({
        url: config.GASLESS_WEBHOOK_URL,
        notify: true
      })
    );
    const content = (postRequestToDiscord as Mock).mock.calls[0][0].content as string;
    expect(content).toMatch(/cap reached/i);
  });

  it('skips bump when the original tx has already mined on-chain', async () => {
    (cacheSetNX as Mock).mockResolvedValueOnce(true);
    getTransactionReceipt.mockResolvedValueOnce({ status: 'success', blockNumber: 123n });

    await handleStillPending(validPayload);

    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('aborts when bumped priority fee would exceed the absolute ceiling', async () => {
    (cacheSetNX as Mock).mockResolvedValueOnce(true);

    await handleStillPending({
      ...validPayload,
      transaction_request: {
        ...validPayload.transaction_request,
        // 0.8 gwei * 1.4 = 1.12 gwei — exceeds the 1 gwei ceiling
        max_priority_fee_per_gas: parseGwei('0.8').toString(),
        max_fee_per_gas: parseGwei('1').toString()
      }
    });

    expect(sendTransaction).not.toHaveBeenCalled();
    expect(postRequestToDiscord).toHaveBeenCalledTimes(1);
    const content = (postRequestToDiscord as Mock).mock.calls[0][0].content as string;
    expect(content).toMatch(/exceed ceiling/i);
  });

  it('rejects unknown wallet ids', async () => {
    await expect(
      handleStillPending({ ...validPayload, wallet_id: 'wallet-unknown' })
    ).rejects.toThrow(/Unknown Privy wallet id/);
    expect(cacheSetNX).not.toHaveBeenCalled();
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('aborts when payload caip2 does not match wallet network', async () => {
    await handleStillPending({
      ...validPayload,
      // mainnet wallet but testnet caip2 — refuse
      caip2: 'eip155:421614'
    });

    expect(sendTransaction).not.toHaveBeenCalled();
    expect(postRequestToDiscord).toHaveBeenCalledTimes(1);
    const content = (postRequestToDiscord as Mock).mock.calls[0][0].content as string;
    expect(content).toMatch(/does not match/i);
  });

  it('routes testnet wallet using the testnet CAIP-2', async () => {
    (cacheSetNX as Mock).mockResolvedValueOnce(true);
    sendTransaction.mockResolvedValue({});

    await handleStillPending({
      ...validPayload,
      wallet_id: 'wallet-testnet',
      caip2: 'eip155:421614',
      transaction_request: { ...validPayload.transaction_request, chain_id: 421614 }
    });

    expect(sendTransaction.mock.calls[0][1].caip2).toBe('eip155:421614');
  });
});

describe('__testables.bump', () => {
  it('multiplies by 1.4 using integer arithmetic', () => {
    expect(__testables.bump(100n)).toBe(140n);
    expect(__testables.bump(7n)).toBe(9n); // 7 * 14 / 10 = 98/10 = 9 (truncated)
  });
});
