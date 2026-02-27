/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const allArbitrumVotes = (chainId: number, address: string, startUnix: number) => /* GraphQL */ `
{
  arbitrumPollVotes: ArbitrumPollVote(
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { voter: { id: { _eq: "${chainId}-${address}" } } },
      { blockTime: { _gt: "${startUnix}" } }
    ] }
    limit: 1000
  ) {
    poll {
      id
    }
    choice
    blockTime
    txnHash
  }
}
`;
