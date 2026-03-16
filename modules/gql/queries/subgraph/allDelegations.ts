/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { stakingEngineAddressMainnet, stakingEngineAddressTestnet } from 'modules/gql/gql.constants';

const stakingEngineAddresses = Array.from(
  new Set([stakingEngineAddressMainnet, stakingEngineAddressTestnet])
);

export const stakingEngineDelegations = (chainId: number) => /* GraphQL */ `
{
  delegations: Delegation(
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { delegate: { version: { _eq: "3" } } },
      { delegator: { _in: ["${stakingEngineAddresses.join('", "')}"] } },
      { amount: { _gt: "0" } }
    ] }
  ) {
    delegate {
      totalDelegated
      delegators
    }
    amount
  }
}
`;
