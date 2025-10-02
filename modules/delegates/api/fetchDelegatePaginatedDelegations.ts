/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { gqlRequest } from 'modules/gql/gqlRequest';
import { delegateWithPaginatedDelegations } from 'modules/gql/queries/subgraph/delegateWithPaginatedDelegations';
import { SupportedNetworks } from 'modules/web3/constants/networks';
import { formatCurrentDelegations } from '../helpers/formatCurrentDelegations';
import { DelegationHistory } from '../types';
import { networkNameToChainId } from 'modules/web3/helpers/chain';

export type PaginatedDelegationsResponse = {
  delegations: DelegationHistory[];
  total: number;
};

export async function fetchDelegatePaginatedDelegations(
  delegateAddress: string,
  network: SupportedNetworks,
  offset: number,
  limit: number
): Promise<PaginatedDelegationsResponse> {
  const delegateId = delegateAddress.toLowerCase();
  const chainId = networkNameToChainId(network);
  const response = await gqlRequest({
    chainId,
    query: delegateWithPaginatedDelegations,
    variables: {
      id: delegateId,
      first: limit,
      skip: offset,
      orderBy: 'amount',
      orderDirection: 'desc'
    }
  });

  if (!response.delegate || !response.delegate.delegations) {
    return {
      delegations: [],
      total: 0
    };
  }

  const formattedDelegations = formatCurrentDelegations(response.delegate.delegations);
  const totalDelegators = response.delegate.delegators || 0;

  return {
    delegations: formattedDelegations,
    total: totalDelegators
  };
}