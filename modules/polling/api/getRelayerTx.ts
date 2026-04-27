/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { SupportedNetworks } from 'modules/web3/constants/networks';
import { getGaslessPublicClient } from 'modules/web3/helpers/getPublicClient';
import { networkNameToChainId } from 'modules/web3/helpers/chain';

// Status values mirror what the frontend BallotContext used to receive from
// Defender Relay so the polling logic does not need to change.
export type RelayerTxStatus = 'pending' | 'sent' | 'mined' | 'failed';

export type RelayerTx = {
  hash: `0x${string}`;
  transactionId: `0x${string}`;
  status: RelayerTxStatus;
};

export const getRelayerTx = async (
  txHash: string,
  network: SupportedNetworks
): Promise<RelayerTx> => {
  if (!Object.values(SupportedNetworks).includes(network)) {
    throw new Error(`Unsupported network: ${network}`);
  }

  const hash = txHash as `0x${string}`;
  const publicClient = getGaslessPublicClient(networkNameToChainId(network));

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash });
    return {
      hash,
      transactionId: hash,
      status: receipt.status === 'success' ? 'mined' : 'failed'
    };
  } catch {
    // Receipt not yet available — tx is still in flight.
    return { hash, transactionId: hash, status: 'sent' };
  }
};
