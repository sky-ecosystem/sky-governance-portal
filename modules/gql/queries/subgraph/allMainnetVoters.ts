/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const allMainnetVoters = (chainId: number, pollId: string) => /* GraphQL */ `
{
  pollVotes: PollVote(
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { poll: { id: { _eq: "${chainId}-${pollId}" } } }
    ] }
  ) {
    id
    voter {
      id
      address
    }
    blockTime
    choice
    txnHash
  }
}
`;
