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

interface Delegation {
  delegator: string;
  delegate: {
    id: string;
    version: string;
  };
  amount: string;
}

export async function fetchDelegationMetrics(network: SupportedNetworks): Promise<DelegationMetrics> {
  const chainId = networkNameToChainId(network);
  const pageSize = 1000;
  let skip = 0;
  let hasMore = true;
  const allDelegations: Delegation[] = [];

  // Fetch all delegations using pagination
  while (hasMore) {
    const res = await gqlRequest<any>({
      chainId,
      query: allDelegationsPaginated,
      variables: {
        first: pageSize,
        skip
      }
    });

    const delegations = res.delegations || [];
    allDelegations.push(...delegations);

    // Check if there are more results to fetch
    hasMore = delegations.length === pageSize;
    skip += pageSize;
  }

  // Calculate metrics from all delegations
  const totalSkyDelegated = formatEther(allDelegations.reduce((acc, cur) => acc + BigInt(cur.amount), 0n));
  const delegatorCount = allDelegations.filter(d => BigInt(d.amount) > 0n).length;

  return {
    totalSkyDelegated,
    delegatorCount
  };
}
