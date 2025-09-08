/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { SupportedNetworks } from 'modules/web3/constants/networks';
import { DelegateContractInformation } from '../types';
import { gqlRequest } from 'modules/gql/gqlRequest';
import { allDelegates } from 'modules/gql/queries/subgraph/allDelegates';
import { networkNameToChainId } from 'modules/web3/helpers/chain';
import { formatEther } from 'viem';

export async function fetchChainDelegates(
  network: SupportedNetworks
): Promise<DelegateContractInformation[]> {
  const chainId = networkNameToChainId(network);
  const data = await gqlRequest({
    chainId,
    query: allDelegates
  });

  return data.delegates.map(d => {
    // Ensure blockTimestamp is a valid number
    const blockTimestamp = d.blockTimestamp ? Number(d.blockTimestamp) : 0;
    // Use the totalDelegated field from subgraph instead of manually calculating
    const totalDelegated = d.totalDelegated || '0';
    return {
      blockTimestamp,
      address: d.ownerAddress,
      voteDelegateAddress: d.id,
      skyDelegated: formatEther(BigInt(totalDelegated)),
      delegations: d.delegations || [], // Include current delegations from subgraph
      lastVoteDate: d.voter?.lastVotedTimestamp ? Number(d.voter.lastVotedTimestamp) : null
    };
  });
}
