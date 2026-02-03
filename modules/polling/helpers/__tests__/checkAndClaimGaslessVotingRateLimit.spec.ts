/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { checkAndClaimGaslessVotingRateLimit } from '../checkAndClaimGaslessVotingRateLimit';
import { cacheSetNX } from 'modules/cache/cache';
import { SupportedNetworks } from 'modules/web3/constants/networks';
import { vi, Mock } from 'vitest';

vi.mock('modules/cache/cache');

describe('checkAndClaimGaslessVotingRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false (not rate limited) when slot is claimed successfully', async () => {
    (cacheSetNX as Mock).mockResolvedValue(true);

    const result = await checkAndClaimGaslessVotingRateLimit(
      '0x1234567890abcdef',
      SupportedNetworks.MAINNET
    );

    expect(result).toBe(false);
    expect(cacheSetNX).toHaveBeenCalledTimes(1);
  });

  it('returns true (rate limited) when key already exists', async () => {
    (cacheSetNX as Mock).mockResolvedValue(false);

    const result = await checkAndClaimGaslessVotingRateLimit(
      '0x1234567890abcdef',
      SupportedNetworks.MAINNET
    );

    expect(result).toBe(true);
    expect(cacheSetNX).toHaveBeenCalledTimes(1);
  });

  it('calls cacheSetNX with correct parameters', async () => {
    (cacheSetNX as Mock).mockResolvedValue(true);

    await checkAndClaimGaslessVotingRateLimit('0xTestVoter', SupportedNetworks.MAINNET);

    // Address is lowercased in the cache key
    expect(cacheSetNX).toHaveBeenCalledWith(
      expect.stringContaining('0xtestvoter'),
      expect.any(String),
      SupportedNetworks.MAINNET,
      expect.any(Number)
    );
  });
});
