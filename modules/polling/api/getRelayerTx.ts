/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { SupportedNetworks } from 'modules/web3/constants/networks';
import { privyGetTransaction } from 'lib/privyRest';

export type RelayerTxStatus =
  | 'broadcasted'
  | 'pending'
  | 'confirmed'
  | 'finalized'
  | 'failed'
  | 'execution_reverted'
  | 'provider_error'
  | 'replaced';

export const getRelayerTx = async (
  txId: string,
  network: SupportedNetworks
): Promise<{ hash?: string; transactionId: string; status: RelayerTxStatus; sentAt?: string }> => {
  if (!Object.values(SupportedNetworks).includes(network)) {
    throw new Error(`Unsupported network: ${network}`);
  }

  const tx = await privyGetTransaction(txId);
  return {
    hash: tx.transaction_hash ?? undefined,
    transactionId: tx.id,
    status: tx.status as RelayerTxStatus,
    sentAt: tx.created_at ? new Date(tx.created_at).toISOString() : undefined
  };
};
