/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

export const allLocksSummed = /* GraphQL */ `
  query allLocksSummed($unixtimeStart: Int!, $unixtimeEnd: Int!) {
    allLocksSummed(unixtimeStart: $unixtimeStart, unixtimeEnd: $unixtimeEnd) {
      nodes {
        fromAddress
        immediateCaller
        lockAmount
        blockNumber
        blockTimestamp
        lockTotal
        hash
      }
    }
  }
`;
