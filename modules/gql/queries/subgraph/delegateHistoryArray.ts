/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const delegateHistoryArray = /* GraphQL */ `
  query delegateHistoryArray($delegates: [String!]!, $engines: [String!]) {
    delegates(where: { id_in: $delegates, version: "3" }) {
      delegationHistory(first: 1000, where: {delegator_not_in: $engines}) {
        amount
        accumulatedAmount
        delegator
        blockNumber
        timestamp
        txnHash
        delegate {
          id
        }
        isStakingEngine
      }
    }
  }
`;
