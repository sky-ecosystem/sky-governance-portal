/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const allDelegatesExecSupport = (chainId: number) => /* GraphQL */ `
{
  delegates: Delegate(
    limit: 1000,
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { version: { _eq: "3" } }
    ] }
  ) {
    blockTimestamp
    ownerAddress
    id
    address
    totalDelegated
    voter {
      lastVotedTimestamp
      currentSpellsV2
    }
  }
}
`;
