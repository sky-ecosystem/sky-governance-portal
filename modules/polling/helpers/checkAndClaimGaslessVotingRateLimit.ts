/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { getRecentlyUsedGaslessVotingKey } from 'modules/cache/constants/cache-keys';
import { cacheSetNX } from 'modules/cache/cache';
import { SupportedNetworks } from 'modules/web3/constants/networks';
import { GASLESS_RATE_LIMIT_IN_MS } from 'modules/polling/polling.constants';

/**
 * Atomically checks and claims the rate limit slot for gasless voting.
 * Returns true if user is rate limited (key already existed),
 * false if slot was claimed successfully.
 */
export async function checkAndClaimGaslessVotingRateLimit(
  voter: string,
  network: SupportedNetworks
): Promise<boolean> {
  const cacheKey = getRecentlyUsedGaslessVotingKey(voter);
  const claimed = await cacheSetNX(cacheKey, JSON.stringify(Date.now()), network, GASLESS_RATE_LIMIT_IN_MS);
  return !claimed; // true = rate limited (key existed), false = claimed slot
}
