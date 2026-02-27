/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const delegateWithPaginatedDelegations = (
  chainId: number,
  id: string,
  first: number,
  skip: number,
  orderBy: string,
  orderDirection: string,
  excludeAddresses: string[],
  stakingEngineAddresses: string[]
) => {
  const formattedExclude = excludeAddresses.map(a => `"${a}"`).join(', ');
  const formattedEngines = stakingEngineAddresses.map(a => `"${a}"`).join(', ');
  return /* GraphQL */ `
{
  delegate: Delegate_by_pk(id: "${chainId}-${id}") {
    id
    address
    blockTimestamp
    blockNumber
    ownerAddress
    delegators
    voter {
      lastVotedTimestamp
    }
    delegations(
      limit: ${first}
      offset: ${skip}
      order_by: { ${orderBy}: ${orderDirection} }
      where: { delegator: { _nin: [${formattedExclude}] } }
    ) {
      delegator
      amount
    }
    stakingEngineDelegations: delegations(where: { delegator: { _in: [${formattedEngines}] } }) {
      delegator
    }
  }
}
`;
};
