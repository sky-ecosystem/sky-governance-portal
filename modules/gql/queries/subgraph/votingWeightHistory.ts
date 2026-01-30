/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const votingWeightHistory = /* GraphQL */ `
  query VotingWeightHistory($argAddress: String){
    executiveVotingPowerChangeV2S(where: {voter: $argAddress}){
			blockTimestamp
      newBalance
    }
    }
`;
