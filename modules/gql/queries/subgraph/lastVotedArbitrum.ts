/*
SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later
*/

export const lastVotedArbitrum = (chainId: number, addresses: string[]) => {
  const prefixedAddresses = addresses.map(a => `"${chainId}-${a}"`).join(', ');
  return /* GraphQL */ `
{
  arbitrumVoters: ArbitrumVoter(
    where: { _and: [
      { chainId: { _eq: ${chainId} } },
      { id: { _in: [${prefixedAddresses}] } }
    ] }
  ) {
    id
    address
    pollVotes(order_by: { blockTime: desc }, limit: 1) {
      blockTime
    }
  }
}
`;
};
