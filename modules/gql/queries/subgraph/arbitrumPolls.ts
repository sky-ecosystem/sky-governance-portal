/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const arbitrumPollsQueryWithWhitelist = (chainId: number, skip: number, creatorWhitelist: string[]) => {
  const formattedWhitelist = creatorWhitelist.map(w => `"${w}"`).join(', ');
  return /* GraphQL */ `
{
  arbitrumPolls: ArbitrumPoll(
    limit: 1000
    offset: ${skip}
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { url: { _is_null: false } },
      { blockCreated: { _is_null: false } },
      { blockWithdrawn: { _is_null: true } },
      { creator: { _in: [${formattedWhitelist}] } }
    ] }
  ) {
    id
    url
    multiHash
  }
}
`;
};

export const arbitrumPollsQuery = (chainId: number, skip: number) => /* GraphQL */ `
{
  arbitrumPolls: ArbitrumPoll(
    limit: 1000
    offset: ${skip}
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { url: { _is_null: false } },
      { blockCreated: { _is_null: false } },
      { blockWithdrawn: { _is_null: true } }
    ] }
  ) {
    id
    url
    multiHash
  }
}
`;
