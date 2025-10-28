/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const allArbitrumVoters = /* GraphQL */ `
  query allArbitrumVoters($argPollId: String) {
    arbitrumPoll(id: $argPollId) {
      startDate
      endDate
      votes {
        voter {
          id
        }
        blockTime
        choice
        txnHash
      }
    }
  }
`;
