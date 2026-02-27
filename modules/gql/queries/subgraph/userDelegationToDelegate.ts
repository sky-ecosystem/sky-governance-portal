/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const userDelegationToDelegate = (chainId: number, delegate: string, delegator: string) => /* GraphQL */ `
{
  delegate: Delegate_by_pk(id: "${chainId}-${delegate}") {
    delegationHistory(limit: 1000, where: { delegator: { _eq: "${delegator}" } }) {
      amount
      accumulatedAmount
      delegator
      blockNumber
      timestamp
      txnHash
      delegate {
        id
        address
      }
      isStakingEngine
    }
  }
}
`;
