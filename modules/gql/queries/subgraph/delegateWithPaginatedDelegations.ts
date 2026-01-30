/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const delegateWithPaginatedDelegations = /* GraphQL */ `
  query delegateWithPaginatedDelegations(
    $id: ID!
    $first: Int!
    $skip: Int!
    $orderBy: String
    $orderDirection: String
    $excludeAddresses: [String!]
    $stakingEngineAddresses: [String!]!
  ) {
    delegate(id: $id) {
      id
      blockTimestamp
      blockNumber
      ownerAddress
      delegators
      voter {
        lastVotedTimestamp
      }
      delegations(
        first: $first
        skip: $skip
        orderBy: $orderBy
        orderDirection: $orderDirection
        where: { delegator_not_in: $excludeAddresses }
      ) {
        delegator
        amount
      }
      stakingEngineDelegations: delegations(where: { delegator_in: $stakingEngineAddresses }) {
        delegator
      }
    }
  }
`;
