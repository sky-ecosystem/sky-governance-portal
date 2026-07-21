/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { toBuffer } from 'lib/utils';

export function parseRawOptionId(rawValue?: string): number[] {
  let voteBallot: number[] = [];
  if (rawValue) {
    const ballotBuffer = toBuffer(rawValue, { endian: 'little' });
    const ballot = [...ballotBuffer];
    voteBallot = ballot.reverse();
  }

  // A voter can never legitimately rank or approve the same option twice, in any
  // poll format (single-choice, ranked-choice or approval). Duplicate bytes in the
  // raw optionId would otherwise be counted once per occurrence during tallying,
  // letting a single voter multiply their own weight for an option (Immunefi #82775).
  // A Set preserves insertion order and keeps the first occurrence, so the ranking
  // order used by instant-runoff polls is left intact.
  return [...new Set(voteBallot)];
}
