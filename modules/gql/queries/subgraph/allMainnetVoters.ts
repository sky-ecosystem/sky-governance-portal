/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const allMainnetVoters = /* GraphQL */ `
  query allMainnetVoters($argPollId: String) {
    pollVotes(where: { poll: $argPollId }) {
      id
      voter {
        id
      }
      blockTime
      choice
      txnHash
    }
  }
`;
