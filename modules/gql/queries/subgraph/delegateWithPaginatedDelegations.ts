/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { gql } from 'graphql-request';

export const delegateWithPaginatedDelegations = gql`
  query delegateWithPaginatedDelegations(
    $id: ID!
    $first: Int!
    $skip: Int!
    $orderBy: String
    $orderDirection: String
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
        where: {
          delegator_not_in: ["0xce01c90de7fd1bcfa39e237fe6d8d9f569e8a6a3", "0xb1fc11f03b084fff8dae95fa08e8d69ad2547ec1"]
        }
      ) {
        delegator
        amount
      }
    }
  }
`;