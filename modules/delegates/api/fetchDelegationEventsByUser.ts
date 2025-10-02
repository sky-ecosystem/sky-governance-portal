/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import logger from 'lib/logger';
import { gqlRequest } from 'modules/gql/gqlRequest';
import { userDelegationToDelegate } from 'modules/gql/queries/subgraph/userDelegationToDelegate';
import { SupportedNetworks } from 'modules/web3/constants/networks';
import { networkNameToChainId } from 'modules/web3/helpers/chain';
import { SkyLockedDelegateApiResponse } from '../types';
import { formatEther } from 'viem';

export async function fetchDelegationEventsByUser(
  delegateAddress: string,
  userAddress: string,
  network: SupportedNetworks
): Promise<SkyLockedDelegateApiResponse[]> {
  try {
    const data = await gqlRequest({
      chainId: networkNameToChainId(network),
      query: userDelegationToDelegate,
      variables: {
        delegate: delegateAddress.toLowerCase(),
        delegator: userAddress.toLowerCase()
      }
    });
    
    if (!data.delegate) {
      return [];
    }
    
    const delegationHistory = data.delegate.delegationHistory;

    const addressData: SkyLockedDelegateApiResponse[] = delegationHistory.map(x => {
      return {
        delegateContractAddress: x.delegate.id,
        immediateCaller: x.delegator,
        lockAmount: formatEther(x.amount),
        blockNumber: x.blockNumber,
        blockTimestamp: new Date(parseInt(x.timestamp) * 1000).toISOString(),
        hash: x.txnHash,
        callerLockTotal: formatEther(x.accumulatedAmount),
        isStakingEngine: x.isStakingEngine
      };
    });
    return addressData;
  } catch (e) {
    logger.error('fetchDelegationEventsByUser: Error fetching delegation events', e.message);
    return [];
  }
}