/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { parseRawOptionId } from '../parseRawOptionId';

describe('parseRawOptionId', () => {
  it('returns an empty ballot for an empty or undefined raw value', () => {
    expect(parseRawOptionId(undefined)).toEqual([]);
    expect(parseRawOptionId('')).toEqual([]);
  });

  it('decodes a single-option ballot', () => {
    expect(parseRawOptionId('1')).toEqual([1]);
    expect(parseRawOptionId('2')).toEqual([2]);
  });

  it('decodes a ranked ballot preserving order', () => {
    // 0x030102 -> option ranking [2, 1, 3]
    expect(parseRawOptionId('196866')).toEqual([2, 1, 3]);
  });

  // Regression: Immunefi #82775 - a raw optionId whose bytes repeat the same option
  // must not inflate that option's weight. Duplicates are collapsed to a single entry.
  it('deduplicates repeated options so weight cannot be multiplied', () => {
    // 0x0101 -> [1, 1] before dedup
    expect(parseRawOptionId('257')).toEqual([1]);
    // 0x0101010101010101 -> [1, 1, 1, 1, 1, 1, 1, 1] before dedup (8x amplification attempt)
    expect(parseRawOptionId('72340172838076673')).toEqual([1]);
  });

  it('deduplicates while keeping the first occurrence and ranking order', () => {
    // 0x010201 -> [1, 2, 1] before dedup -> [1, 2]
    expect(parseRawOptionId('66049')).toEqual([1, 2]);
    // 0x02030103 -> [3, 1, 3, 2] before dedup -> [3, 1, 2]
    expect(parseRawOptionId('33751299')).toEqual([3, 1, 2]);
  });
});
