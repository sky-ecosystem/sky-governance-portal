/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const voteAddressSkyWeightsAtTime = /* GraphQL */ `
  query voteAddressSkyWeightsAtTime($argVoters: [String!]!, $argUnix: BigInt!) {
    voters(where: { id_in: $argVoters }) {
      id
      v2VotingPowerChanges(
        first: 1
        orderDirection: desc
        orderBy: blockTimestamp
        where: { blockTimestamp_lte: $argUnix }
      ) {
        newBalance
      }
    }
  }
`;
