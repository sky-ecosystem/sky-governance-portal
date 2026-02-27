/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const allDelegates = (chainId: number) => /* GraphQL */ `
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
    }
    delegations(
      limit: 1000
      where: { _and: [
        { delegator: { _nin: ["0xce01c90de7fd1bcfa39e237fe6d8d9f569e8a6a3", "0xb1fc11f03b084fff8dae95fa08e8d69ad2547ec1"] } },
        { amount: { _gt: "0" } }
      ] }
    ) {
      delegator
      amount
    }
  }
}
`;
