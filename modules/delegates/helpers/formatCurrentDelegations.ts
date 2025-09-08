/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { formatEther, parseEther } from 'viem';
import { DelegationHistory } from '../types/delegate';

type CurrentDelegation = {
  delegator: string;
  amount: string;
};

/**
 * Converts current delegations data (from subgraph) into DelegationHistory format
 * This format is used by the DelegatedByAddress component for display
 */
export const formatCurrentDelegations = (delegations: CurrentDelegation[]): DelegationHistory[] => {
  const delegators = delegations
    .filter(({ delegator, amount }) => delegator && amount && BigInt(amount) > 0n) // Only show active delegations with valid addresses
    .map(({ delegator, amount }) => ({
      address: delegator,
      lockAmount: formatEther(BigInt(amount)), // Amount is already in wei, just convert to ether
      events: [] // Events will be lazy-loaded when user expands the row
    }));

  // Sort by delegation amount (highest first)
  return delegators.sort((a, b) => (parseEther(a.lockAmount) > parseEther(b.lockAmount) ? -1 : 1));
};