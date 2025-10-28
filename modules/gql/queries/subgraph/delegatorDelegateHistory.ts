/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const delegatorDelegateHistory = /* GraphQL */ `
  query delegatorDelegateHistory($delegator: String!, $delegate: String!) {
    delegationHistories(
      first: 1000
      where: { delegator: $delegator, delegate: $delegate }
      orderBy: timestamp
      orderDirection: desc
    ) {
      amount
      accumulatedAmount
      delegate {
        id
      }
      timestamp
      txnHash
      blockNumber
      isStakingEngine
    }
  }
`;