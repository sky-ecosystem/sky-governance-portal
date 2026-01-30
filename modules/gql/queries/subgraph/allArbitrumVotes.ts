/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const allArbitrumVotes = /* GraphQL */ `
  query allArbitrumVotes($argAddress: String!, $startUnix: BigInt) {
		arbitrumPollVotes(where: {voter: $argAddress, blockTime_gt: $startUnix}, first: 1000) {
      poll {
        id
      }
      choice
      blockTime
      txnHash
    }
  }
`;
