/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { gqlRequest } from 'modules/gql/gqlRequest';
import { allDelegates } from 'modules/gql/queries/subgraph/allDelegates';
import { stakingEngineDelegations } from 'modules/gql/queries/subgraph/allDelegations';
import { SupportedNetworks } from 'modules/web3/constants/networks';
import { networkNameToChainId } from 'modules/web3/helpers/chain';
import { formatEther } from 'viem';

interface DelegationMetrics {
  totalSkyDelegated: string;
  delegatorCount: number;
}

interface Delegate {
  totalDelegated: string;
  delegators: number;
}

interface StakingEngineDelegation {
  delegate: Delegate;
  amount: string;
}

export async function fetchDelegationMetrics(network: SupportedNetworks): Promise<DelegationMetrics> {
  const chainId = networkNameToChainId(network);
  const [delegatesRes, stakingEngineDelegationsRes] = await Promise.all([
    gqlRequest<{ delegates: Delegate[] }>({
      chainId,
      query: allDelegates(chainId)
    }),
    gqlRequest<{ delegations: StakingEngineDelegation[] }>({
      chainId,
      query: stakingEngineDelegations(chainId)
    })
  ]);

  const delegates = delegatesRes.delegates || [];
  const stakingDelegations = stakingEngineDelegationsRes.delegations || [];
  const totalDelegated = delegates.reduce((acc, cur) => acc + BigInt(cur.totalDelegated || '0'), 0n);
  const totalDelegators = delegates.reduce((acc, cur) => acc + (cur.delegators || 0), 0);
  const stakingEngineDelegated = stakingDelegations.reduce(
    (acc, cur) => acc + BigInt(cur.amount || '0'),
    0n
  );

  const totalSkyDelegated = formatEther(
    totalDelegated - stakingEngineDelegated
  );
  const delegatorCount = Math.max(0, totalDelegators - stakingDelegations.length);

  return {
    totalSkyDelegated,
    delegatorCount
  };
}
