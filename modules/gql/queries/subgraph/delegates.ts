/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

const delegateFields = /* GraphQL */ `
  blockTimestamp
  blockNumber
  ownerAddress
  totalDelegated
  id
  address
  delegators
  voter {
    lastVotedTimestamp
  }
`;

interface DelegatesQueryParams {
  chainId: number;
  limit: number;
  offset: number;
  orderBy: string;
  orderDirection: string;
  whereConditions: string[];
}

export const delegatesQuerySubsequentPages = ({
  chainId,
  limit,
  offset,
  orderBy,
  orderDirection,
  whereConditions
}: DelegatesQueryParams) => /* GraphQL */ `
{
  delegates: Delegate(
    where: { _and: [{ chainId: { _eq: ${chainId} } }, ${whereConditions.join(', ')}] }
    limit: ${limit}
    offset: ${offset}
    order_by: { ${orderBy}: ${orderDirection} }
  ) {
    ${delegateFields}
  }
}
`;

interface DelegatesFirstPageQueryParams {
  chainId: number;
  limit: number;
  orderBy: string;
  orderDirection: string;
  shadowWhereConditions: string[];
  alignedWhereConditions: string[];
}

export const delegatesQueryFirstPage = ({
  chainId,
  limit,
  orderBy,
  orderDirection,
  shadowWhereConditions,
  alignedWhereConditions
}: DelegatesFirstPageQueryParams) => /* GraphQL */ `
{
  delegates: Delegate(
    where: { _and: [{ chainId: { _eq: ${chainId} } }, ${shadowWhereConditions.join(', ')}] }
    limit: ${limit}
    offset: 0
    order_by: { ${orderBy}: ${orderDirection} }
  ) {
    ${delegateFields}
  }
  alignedDelegates: Delegate(
    where: { _and: [{ chainId: { _eq: ${chainId} } }, ${alignedWhereConditions.join(', ')}] }
    order_by: { ${orderBy}: ${orderDirection} }
  ) {
    ${delegateFields}
  }
}
`;
