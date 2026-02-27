/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const pollTimes = (chainId: number, pollIds: string[]) => {
  const prefixedIds = pollIds.map(id => `"${chainId}-${id}"`).join(', ');
  return /* GraphQL */ `
{
  arbitrumPolls: ArbitrumPoll(
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { id: { _in: [${prefixedIds}] } }
    ] }
  ) {
    startDate
    endDate
    id
    pollId
  }
}
`;
};
