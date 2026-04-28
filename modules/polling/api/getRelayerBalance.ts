/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import { SupportedNetworks } from 'modules/web3/constants/networks';
import { formatEther } from 'viem';
import { getArbitrumRelaySigner } from './getArbitrumRelaySigner';
import logger from 'lib/logger';
import { getGaslessPublicClient } from 'modules/web3/helpers/getPublicClient';
import { networkNameToChainId } from 'modules/web3/helpers/chain';
import { isPrivyRelayerEnabled } from 'lib/config';
import { getPrivyClient } from 'lib/getPrivyClient';
import { getPrivyWalletConfig } from '../helpers/relayerCredentials';

// Memoize wallet-id → address. Privy server-wallet addresses never change for a wallet id,
// so a single lookup per process is enough.
const privyAddressCache: Record<string, string> = {};

async function resolvePrivyAddress(walletId: string): Promise<string> {
  if (privyAddressCache[walletId]) return privyAddressCache[walletId];
  const wallet = await getPrivyClient().wallets().get(walletId);
  privyAddressCache[walletId] = wallet.address;
  return wallet.address;
}

export const getRelayerBalance = async (network: SupportedNetworks): Promise<string> => {
  try {
    if (!Object.values(SupportedNetworks).includes(network)) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const gaslessPublicClient = getGaslessPublicClient(networkNameToChainId(network));

    let address: string;
    if (isPrivyRelayerEnabled()) {
      const { walletId } = getPrivyWalletConfig(network);
      address = await resolvePrivyAddress(walletId);
    } else {
      const relayer = getArbitrumRelaySigner(network);
      const relayerInstance = await relayer.getRelayer();
      address = relayerInstance.address;
    }

    const balance = await gaslessPublicClient.getBalance({ address: address as `0x${string}` });
    return formatEther(balance);
  } catch (err) {
    logger.error(err);
    return '0';
  }
};
