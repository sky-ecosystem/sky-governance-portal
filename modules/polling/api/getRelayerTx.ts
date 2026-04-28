/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { SupportedNetworks } from 'modules/web3/constants/networks';
import { Relayer } from 'defender-relay-client';
import { relayerCredentials } from '../helpers/relayerCredentials';
import { isPrivyRelayerEnabled } from 'lib/config';
import { getPrivyClient } from 'lib/getPrivyClient';
import { mapPrivyStatus, LegacyRelayerTxStatus, PrivyTransactionState } from './mapPrivyStatus';

export type { LegacyRelayerTxStatus, PrivyTransactionState };
export { mapPrivyStatus };

export const getRelayerTx = async (
  txId: string,
  network: SupportedNetworks
): Promise<{ hash?: string; transactionId: string; status: LegacyRelayerTxStatus; sentAt?: string }> => {
  if (!Object.values(SupportedNetworks).includes(network)) {
    throw new Error(`Unsupported network: ${network}`);
  }

  if (isPrivyRelayerEnabled()) {
    const privy = getPrivyClient();
    const tx = await privy.transactions().get(txId);
    return {
      hash: tx.transaction_hash ?? undefined,
      transactionId: tx.id,
      status: mapPrivyStatus(tx.status as PrivyTransactionState),
      sentAt: tx.created_at ? new Date(tx.created_at).toISOString() : undefined
    };
  }

  const relayer = new Relayer(relayerCredentials[network]);
  return relayer.query(txId);
};
