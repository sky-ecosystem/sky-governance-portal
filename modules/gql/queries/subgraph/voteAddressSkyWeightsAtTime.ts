/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const voteAddressSkyWeightsAtTime = (chainId: number, voters: string[], unix: number) => {
  const prefixedVoters = voters.map(v => `"${chainId}-${v}"`).join(', ');
  return /* GraphQL */ `
{
  voters: Voter(
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { id: { _in: [${prefixedVoters}] } }
    ] }
  ) {
    id
    address
    v2VotingPowerChanges(
      limit: 1
      order_by: { blockTimestamp: desc }
      where: { blockTimestamp: { _lte: "${unix}" } }
    ) {
      newBalance
    }
  }
}
`;
};
