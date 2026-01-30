/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const userDelegationToDelegate = /* GraphQL */ `
  query userDelegationToDelegate($delegate: String!, $delegator: String!) {
    delegate(id: $delegate) {
      delegationHistory(first: 1000, where: {delegator: $delegator}) {
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