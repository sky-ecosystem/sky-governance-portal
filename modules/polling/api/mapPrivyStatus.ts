/*

SPDX-FileCopyrightText: © 2026 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

// BallotContext.tsx consumes: 'pending' | 'sent' | 'submitted' | 'inmempool' | 'mined' | 'confirmed' | 'failed'
export type LegacyRelayerTxStatus =
  | 'pending'
  | 'sent'
  | 'submitted'
  | 'inmempool'
  | 'mined'
  | 'confirmed'
  | 'failed';

export type PrivyTransactionState =
  | 'broadcasted'
  | 'pending'
  | 'confirmed'
  | 'finalized'
  | 'failed'
  | 'execution_reverted'
  | 'provider_error'
  | 'replaced';

export function mapPrivyStatus(state: PrivyTransactionState): LegacyRelayerTxStatus {
  switch (state) {
    case 'broadcasted':
      return 'sent';
    case 'pending':
      return 'submitted';
    case 'confirmed':
      return 'mined';
    case 'finalized':
      return 'confirmed';
    case 'failed':
    case 'execution_reverted':
    case 'provider_error':
      return 'failed';
    case 'replaced':
      // Passthrough: stay in flight while Privy resolves the replacement.
      // Privy reports the terminal state on the original tx_id once the replacement settles.
      return 'submitted';
    default:
      return 'pending';
  }
}
