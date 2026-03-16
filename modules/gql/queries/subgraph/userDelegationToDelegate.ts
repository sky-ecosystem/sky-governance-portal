/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const userDelegationToDelegate = (chainId: number, delegate: string, delegator: string) => /* GraphQL */ `
{
  delegate: Delegate(where: { id: { _ilike: "${chainId}-${delegate}" } }, limit: 1) {
    delegationHistory(limit: 1000, where: { delegator: { _ilike: "${delegator}" } }) {
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
