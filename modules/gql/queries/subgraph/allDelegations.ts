/*
SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>
SPDX-License-Identifier: AGPL-3.0-or-later
*/

export const allDelegationsPaginated = (chainId: number, first: number, skip: number) => /* GraphQL */ `
{
  delegations: Delegation(
    limit: ${first}
    offset: ${skip}
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { delegate: { version: { _eq: "3" } } },
      { _and: [{ delegator: { _nilike: "0xce01c90de7fd1bcfa39e237fe6d8d9f569e8a6a3" } }, { delegator: { _nilike: "0xb1fc11f03b084fff8dae95fa08e8d69ad2547ec1" } }] }
    ] }
  ) {
    delegator
    delegate {
      id
      version
    }
    amount
  }
}
`;
