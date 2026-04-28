/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { describe, it, expect } from 'vitest';
import { mapPrivyStatus, PrivyTransactionState } from '../mapPrivyStatus';

describe('mapPrivyStatus', () => {
  const cases: Array<[PrivyTransactionState, string]> = [
    ['broadcasted', 'sent'],
    ['pending', 'submitted'],
    ['confirmed', 'mined'],
    ['finalized', 'confirmed'],
    ['failed', 'failed'],
    ['execution_reverted', 'failed'],
    ['provider_error', 'failed'],
    ['replaced', 'submitted']
  ];

  for (const [input, expected] of cases) {
    it(`maps Privy '${input}' → '${expected}'`, () => {
      expect(mapPrivyStatus(input)).toBe(expected);
    });
  }

  it('falls back to pending for an unknown state', () => {
    expect(mapPrivyStatus('something-new' as PrivyTransactionState)).toBe('pending');
  });
});
