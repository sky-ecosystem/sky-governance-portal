/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { stakingEngineAddressMainnet, stakingEngineAddressTestnet } from 'modules/gql/gql.constants';

const stakingEngineAddresses = Array.from(
  new Set([stakingEngineAddressMainnet, stakingEngineAddressTestnet])
);

export const allDelegationsPaginated = (chainId: number, limit: number, offset: number) => /* GraphQL */ `
{
  delegations: Delegation(
    limit: ${limit}
    offset: ${offset}
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { delegate: { version: { _eq: "3" } } },
      { delegator: { _nin: ["${stakingEngineAddresses.join('", "')}"] } }
    ] }
  ) {
    delegator
    delegate {
      id
      version
    }
    amount
  }
}
`;
