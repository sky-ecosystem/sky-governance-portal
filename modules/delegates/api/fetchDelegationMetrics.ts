/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { gqlRequest } from 'modules/gql/gqlRequest';
import { allDelegationsPaginated } from 'modules/gql/queries/subgraph/allDelegations';
import { SupportedNetworks } from 'modules/web3/constants/networks';
import { networkNameToChainId } from 'modules/web3/helpers/chain';
import { formatEther } from 'viem';

interface DelegationMetrics {
  totalSkyDelegated: string;
  delegatorCount: number;
}

interface Delegate {
  id: string;
  version: string;
}

interface Delegation {
  delegator: string;
  delegate: Delegate;
  amount: string;
}

export async function fetchDelegationMetrics(network: SupportedNetworks): Promise<DelegationMetrics> {
  const chainId = networkNameToChainId(network);
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  const allDelegations: Delegation[] = [];

  while (hasMore) {
    const res = await gqlRequest<{ delegations: Delegation[] }>({
      chainId,
      query: allDelegationsPaginated(chainId, pageSize, offset)
    });

    const delegations = res.delegations || [];
    allDelegations.push(...delegations);

    hasMore = delegations.length === pageSize;
    offset += pageSize;
  }

  const totalSkyDelegated = formatEther(
    allDelegations.reduce((acc, cur) => acc + BigInt(cur.amount || '0'), 0n)
  );
  const delegatorCount = allDelegations.filter(delegation => BigInt(delegation.amount || '0') > 0n).length;

  return {
    totalSkyDelegated,
    delegatorCount
  };
}
