/*
SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>
SPDX-License-Identifier: AGPL-3.0-or-later
*/

export const allSpellVotes = (chainId: number, skip: number, first: number) => /* GraphQL */ `
{
  executiveVoteV2S: ExecutiveVoteV2(
    limit: ${first}
    offset: ${skip}
    order_by: { id: desc }
    where: { chainId: { _eq: ${chainId} } }
  ) {
    blockTime
    spell {
      id
    }
    voter {
      id
      v2VotingPowerChanges(limit: 1, order_by: { blockTimestamp: desc }) {
        newBalance
      }
    }
  }
}
`;
