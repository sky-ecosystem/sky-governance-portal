/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const votingWeightHistory = (chainId: number, address: string) => /* GraphQL */ `
{
  executiveVotingPowerChangeV2S: ExecutiveVotingPowerChangeV2(
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { voter: { id: { _eq: "${chainId}-${address}" } } }
    ] }
  ) {
    blockTimestamp
    newBalance
  }
}
`;
