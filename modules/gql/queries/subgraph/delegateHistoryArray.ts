/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const delegateHistoryArray = (chainId: number, delegates: string[], engines: string[]) => {
  const prefixedDelegates = delegates.map(d => `"${chainId}-${d}"`).join(', ');
  const formattedEngines = engines.map(e => `"${e}"`).join(', ');
  return /* GraphQL */ `
{
  delegates: Delegate(
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { id: { _in: [${prefixedDelegates}] } },
      { version: { _eq: "3" } }
    ] }
  ) {
    delegationHistory(limit: 1000, where: { delegator: { _nin: [${formattedEngines}] } }) {
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
};
