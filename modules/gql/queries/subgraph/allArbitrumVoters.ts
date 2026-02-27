/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const allArbitrumVoters = (chainId: number, pollId: string) => /* GraphQL */ `
{
  arbitrumPoll: ArbitrumPoll_by_pk(id: "${chainId}-${pollId}") {
    startDate
    endDate
    votes {
      voter {
        id
        address
      }
      blockTime
      choice
      txnHash
    }
  }
}
`;
