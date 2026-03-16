/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const delegateHistoryArray = (chainId: number, delegates: string[], engines: string[]) => {
  const prefixedDelegates = delegates.map(d => `{ id: { _ilike: "${chainId}-${d}" } }`).join(', ');
  const formattedEngines = engines.map(e => `{ delegator: { _nilike: "${e}" } }`).join(', ');
  return /* GraphQL */ `
{
  delegates: Delegate(
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { _or: [${prefixedDelegates}] },
      { version: { _eq: "3" } }
    ] }
  ) {
    delegationHistory(limit: 1000, where: { _and: [${formattedEngines}] }) {
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
};
